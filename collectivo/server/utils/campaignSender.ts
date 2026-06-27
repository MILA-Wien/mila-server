import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import {
  createItems,
  readItem,
  readItems,
  readUser,
  updateItem,
} from "@directus/sdk";
import { parse } from "marked";

// Disable for development
const SENDING_ACTIVE = true;

const directus = useDirectusAdmin();

// ============================================================================
// DURABLE, RESUMABLE EMAIL DRAIN
// ----------------------------------------------------------------------------
// Sending is modelled as a single "drain" over durable state in Directus:
//
//   * The queue of open work is the set of `messages_messages` rows with
//     status "pending" (already persisted when a campaign starts). A server
//     restart therefore never loses the queue - the drain simply resumes the
//     remaining pending messages.
//
//   * Global pacing (at most one email per NUXT_EMAIL_SMTP_DELAY_MS) is seeded
//     from the DB: the timestamp of the most recently *sent* message. This
//     means that even immediately after a restart we wait the full delay
//     instead of bursting, because the in-memory pacer is reset to 0 on
//     restart but re-seeded from the durable record.
//
//   * Exactly one drain runs at a time within the process (the `emailWorker`
//     singleton below). New campaigns arriving while a drain is running do not
//     start a second, parallel stream - they set `rerunRequested` so the
//     running drain makes another pass and picks them up. This removes the old
//     wait-loop-with-timeout, whose 1h fall-through allowed parallel sending.
//
// NOTE: the singleton guard is in-memory, so it serialises sending within one
// Node process. MILA runs a single server instance, so this is sufficient. If
// the deployment is ever scaled to multiple instances, a shared DB lock would
// be required on top of this to keep a single global stream.
// ============================================================================

const emailWorker = {
  isActive: false,
  rerunRequested: false,
};

// Timestamp of the last sent email, used to enforce a global delay across
// campaigns. Reset to 0 on restart and re-seeded from the DB at drain start.
let lastEmailSentAt: number = 0;

// Wait for given milliseconds
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceEmailDelay(delayMs: number) {
  const elapsed = Date.now() - lastEmailSentAt;
  if (elapsed < delayMs) {
    await sleep(delayMs - elapsed);
  }
}

// Start (or request a rerun of) the email drain. Fire-and-forget: the drain
// runs in the background of the persistent Nitro server. Safe to call from
// webhooks, the boot plugin and the cronjob - calls are idempotent.
export function kickEmailDrain() {
  if (emailWorker.isActive) {
    // A drain is already running. Ask it to make another pass so that any
    // newly pending campaigns are picked up without starting a second stream.
    emailWorker.rerunRequested = true;
    return;
  }

  emailWorker.isActive = true;
  drainEmailQueue()
    .catch((error) => {
      console.error("Email drain loop failed unexpectedly:", error);
    })
    .finally(() => {
      emailWorker.isActive = false;
    });
}

async function drainEmailQueue() {
  await seedPacerFromDb();

  do {
    emailWorker.rerunRequested = false;

    const campaignKeys = await dbGetPendingCampaignKeys();

    for (const campaignKey of campaignKeys) {
      try {
        await processCampaign(campaignKey);
      } catch (error) {
        // Keep draining other campaigns even if one fails unexpectedly. The
        // failed campaign stays "pending" and is retried on the next kick.
        console.error("Processing campaign " + campaignKey + " failed:", error);
      }
    }
  } while (emailWorker.rerunRequested);
}

// Re-seed the in-memory pacer from the durable record of the last sent email,
// so the spacing is preserved across restarts (no post-restart burst).
async function seedPacerFromDb() {
  const lastSent = await dbGetLastSentTimestamp();
  if (lastSent) {
    const ms = Date.parse(lastSent.endsWith("Z") ? lastSent : lastSent + "Z");
    if (!Number.isNaN(ms) && ms > lastEmailSentAt) {
      lastEmailSentAt = ms;
    }
  }
}

async function processCampaign(campaignKey: number): Promise<void> {
  const campaignData = await readCampaignData(campaignKey);

  // Re-check status: it may have changed (or already been handled) since it
  // was listed as pending.
  if (campaignData.campaignStatus !== "pending") {
    return;
  }

  if (campaignData.templateMethod !== "email") {
    console.error(
      "Campaign " +
        campaignKey +
        " uses a non-email template; marking as failed.",
    );
    await updateCampaignStatus(campaignKey, "completely_failed");
    return;
  }

  // The pending messages are the durable queue. Create them once, on first
  // processing; on resume after a restart they already exist and we must not
  // recreate them (that would resend to recipients already served).
  let messages = await dbGetMessagesForCampaign(campaignKey);
  if (messages.length === 0) {
    await writeMessagesAsPending(campaignData);
    messages = await dbGetMessagesForCampaign(campaignKey);
  }

  const unpersonalizedTemplate = campaignData.templateDesign.replaceAll(
    "{{content}}",
    campaignData.templateContent,
  );

  const mailSender = MailSender.fromRuntimeConfig();
  const delayMs = Number(useRuntimeConfig().emailSmtpDelayMs);

  for (const message of messages) {
    // Only send messages still pending - already sent/failed ones are skipped
    // so a resumed campaign never double-sends.
    if (message.status !== "pending") {
      continue;
    }

    try {
      const recipientData = await readRecipientData(message.recipient);

      const emailBody = renderTemplateForRecipient(
        unpersonalizedTemplate,
        recipientData,
        campaignData.campaignContext,
      );

      await enforceEmailDelay(delayMs);

      const sendMailOutcome = await mailSender.sendMail({
        to: recipientData.email,
        subject: campaignData.templateSubject,
        htmlBody: emailBody,
      });

      lastEmailSentAt = Date.now();
      await updateMessageStatus(message.id, sendMailOutcome);
    } catch (error) {
      // An unexpected error for a single recipient must not strand the whole
      // campaign. Record the failure and move on. The delay is still enforced
      // before the attempt, so this does not bypass the rate limit.
      lastEmailSentAt = Date.now();
      const errorMessage = getErrorMessage(error);
      console.error(
        "Failed to send message " +
          message.id +
          " for campaign " +
          campaignKey +
          ": " +
          errorMessage,
      );
      await updateMessageStatus(message.id, errorMessage);
    }
  }

  const finalMessages = await dbGetMessagesForCampaign(campaignKey);
  await updateCampaignStatus(campaignKey, computeCampaignStatus(finalMessages));
}

function computeCampaignStatus(messages: MessageRecord[]): string {
  const anySucceeded = messages.some((m) => m.status === "sent");
  const anyFailure = messages.some((m) => m.status !== "sent");

  if (anyFailure) {
    return anySucceeded ? "partially_failed" : "completely_failed";
  }
  return "sent";
}

// ============================================================================
// DIRECTUS QUERIES
// ============================================================================

async function dbGetPendingCampaignKeys(): Promise<number[]> {
  const result = await directus.request(
    readItems("messages_campaigns", {
      filter: { messages_campaign_status: { _eq: "pending" } },
      fields: ["id"],
      sort: ["id"],
      limit: -1,
    }),
  );

  return result.map((item: any) => item.id);
}

async function dbGetMessagesForCampaign(
  campaignKey: number,
): Promise<MessageRecord[]> {
  const result = await directus.request(
    readItems("messages_messages", {
      filter: { messages_campaign: { _eq: campaignKey } },
      fields: ["id", "messages_recipient", "messages_message_status"],
      limit: -1,
    }),
  );

  return result.map((item: any) => ({
    id: item.id,
    recipient: item.messages_recipient,
    status: item.messages_message_status,
  }));
}

async function dbGetLastSentTimestamp(): Promise<string | null> {
  const result = await directus.request(
    readItems("messages_messages", {
      filter: { messages_message_status: { _eq: "sent" } },
      sort: ["-date_updated"],
      limit: 1,
      fields: ["date_updated", "date_created"],
    }),
  );

  const row: any = result[0];
  if (!row) return null;
  return row.date_updated ?? row.date_created ?? null;
}

async function updateCampaignStatus(
  campaignKey: number,
  campaignStatus: string,
) {
  await directus.request(
    updateItem("messages_campaigns", campaignKey, {
      messages_campaign_status: campaignStatus,
    }),
  );
}

async function updateMessageStatus(messageId: number, sendMailOutcome: string) {
  await directus.request(
    updateItem("messages_messages", messageId, {
      messages_message_status: sendMailOutcome == "success" ? "sent" : "failed",
      messages_error_message:
        sendMailOutcome !== "success" ? sendMailOutcome : "",
    }),
  );
}

async function readCampaignData(campaignKey: number): Promise<CampaignData> {
  const readResult: Record<string, any> = await directus.request(
    readItem("messages_campaigns", campaignKey, {
      fields: [
        "messages_campaign_status",
        "messages_context",
        "messages_template.messages_method",
        "messages_template.messages_subject",
        "messages_template.messages_content",
        "messages_template.messages_design.messages_design_html",
        "messages_recipients.directus_users_id",
      ],
    }),
  );

  return {
    campaignKey: campaignKey,
    campaignStatus: readResult["messages_campaign_status"],
    campaignContext: readResult["messages_context"],
    templateMethod: readResult["messages_template"]["messages_method"],
    templateSubject: readResult["messages_template"]["messages_subject"],
    templateContent: readResult["messages_template"]["messages_content"],
    templateDesign: readResult["messages_template"]["messages_design"]
      ? readResult["messages_template"]["messages_design"][
          "messages_design_html"
        ]
      : "{{content}}",
    recipients: readResult["messages_recipients"].map(
      (item: any) => item.directus_users_id,
    ),
  };
}

async function readRecipientData(recipientId: string): Promise<RecipientData> {
  const readResult: Record<string, any> = await directus.request(
    readUser(recipientId, {
      fields: ["username", "username_last", "email"],
    }),
  );

  return {
    id: recipientId,
    username: readResult["username"] + " " + readResult["username_last"],
    first_name: readResult["username"],
    last_name: readResult["username_last"],
    email: readResult["email"],
  };
}

async function writeMessagesAsPending(
  campaignData: CampaignData,
): Promise<void> {
  await directus.request(
    createItems(
      "messages_messages",
      campaignData.recipients.map((recipient) => {
        return {
          messages_message_status: "pending",
          messages_campaign: campaignData.campaignKey,
          messages_recipient: recipient,
        };
      }),
    ),
  );
}

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

function replaceTemplateTags(
  template: string,
  context: { [key: string]: string },
): string {
  return template.replace(/{{\s*([^}]+)\s*}}/g, (match, p1) => {
    const value = String(context[p1.trim()] ?? "");
    if (value.startsWith("markdown:")) {
      return parse(value.split("markdown:")[1]!) as string;
    }
    return value;
  });
}

function renderTemplateForRecipient(
  unpersonalizedTemplate: string,
  recipientData: RecipientData,
  campaignContext: any,
): string {
  campaignContext = campaignContext ? campaignContext : {};

  campaignContext.recipient_first_name = recipientData.first_name;
  campaignContext.recipient_last_name = recipientData.last_name;
  campaignContext.recipient_username = recipientData.username;
  campaignContext.recipient_email = recipientData.email;

  return replaceTemplateTags(unpersonalizedTemplate, campaignContext);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

// ============================================================================
// TYPES
// ============================================================================

interface MessageRecord {
  id: number;
  recipient: string;
  status: string;
}

interface CampaignData {
  campaignKey: number;
  campaignContext: string;
  campaignStatus: string;
  templateMethod: string;
  templateSubject: string;
  templateContent: string;
  templateDesign: string;
  recipients: string[];
}

interface RecipientData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Mail {
  to: string;
  subject: string;
  htmlBody: string;
}

// ============================================================================
// MAIL SENDER
// ============================================================================

class MailSender {
  transporter: Transporter;
  fromAddress?: string;

  constructor(transportConfig: SMTPTransport.Options, fromAddress?: string) {
    this.transporter = nodemailer.createTransport(transportConfig);
    this.fromAddress = fromAddress;
  }

  static fromRuntimeConfig() {
    const config = useRuntimeConfig();
    return new MailSender(
      {
        host: config.emailSmtpHost,
        port: Number(config.emailSmtpPort),
        // secure: true, // use TLS
        auth: {
          user: config.emailSmtpUser,
          pass: config.emailSmtpPassword,
        },
      },
      config.emailFrom,
    );
  }

  async sendMail(mail: Mail): Promise<string> {
    const maxAttempts = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await this.sendMailOnce(mail);
      } catch (error) {
        // Wait a minute if we hit the rate limit (HTTP 429)
        if (
          error &&
          typeof error == "object" &&
          "responseCode" in error &&
          error.responseCode == 429
        ) {
          await sleep(60000);
        } else {
          return getErrorMessage(error);
        }
      }
    }

    return "Rate limit exceeded, maximum attempts reached";
  }

  async sendMailOnce(mail: Mail): Promise<string> {
    if (SENDING_ACTIVE) {
      await this.transporter.sendMail({
        from: this.fromAddress ? this.fromAddress : "",
        to: mail.to,
        subject: mail.subject,
        html: mail.htmlBody,
      });
    }
    return "success";
  }
}
