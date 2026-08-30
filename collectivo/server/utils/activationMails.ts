/*
 * Member activation emails, sent by the daily cronjob.
 *
 * Two automations, both keyed in `mila_automations` and both shipping inactive so the
 * Activation Team decides when they go live:
 *
 *   activation_frozen  - on the day a membership's shift counter crosses into frozen
 *   activation_survey  - 28 days later, carrying the five-option survey
 *
 * Neither writes any copy: subject and body live in `messages_templates` and are edited
 * in Directus.
 */

import {
  dbGetActivationRecipientsByIds,
  dbGetMembershipsDueForSurvey,
  type ActivationRecipient,
} from "./dbShifts";
import { dbGetLastCampaignSentAt } from "./dbCampaigns";
import {
  buildActivationSurveyUrls,
  selectSurveyRecipients,
} from "../../shared/activationSurvey";

/** Days a membership stays frozen before it is asked the survey. */
export const ACTIVATION_SURVEY_DELAY_DAYS = 28;

const FROZEN_AUTOMATION_KEY = "activation_frozen";
const SURVEY_AUTOMATION_KEY = "activation_survey";

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

/**
 * Resolves an automation and its template.
 *
 * Returns null when the automation is switched off. Unlike the older reminder jobs this
 * does not throw in that case: both activation automations are deliberately shipped
 * inactive, and throwing would log an error every single night until someone enabled
 * them. A *missing* row is still a real misconfiguration and does throw.
 */
async function resolveAutomation(key: string): Promise<number | null> {
  const automation = await dbGetAutomation(key);
  if (!automation) {
    throw new Error(`Automation "${key}" not found`);
  }
  if (!automation.mila_active) return null;
  if (!automation.mila_template) {
    throw new Error(`Automation "${key}" has no template assigned`);
  }
  return typeof automation.mila_template === "number"
    ? automation.mila_template
    : automation.mila_template.id;
}

async function sendCampaigns(
  recipients: { userId: string; member: ActivationRecipient }[],
  templateId: number,
  buildContext: (member: ActivationRecipient) => Record<string, unknown>,
  label: string,
) {
  if (!recipients.length) return;
  console.log(`Sending ${label}`, recipients.length);

  const campaign_ids: number[] = [];
  for (const { userId, member } of recipients) {
    const payload = [
      {
        messages_recipients: {
          create: [
            {
              directus_users_id: { id: userId },
              messages_campaigns_id: "+",
            },
          ],
        },
        messages_context: buildContext(member),
        messages_template: templateId,
      },
    ];
    const campaign = (await dbCreateCampaign(payload)) as any;
    campaign_ids.push(campaign[0].id);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (!campaign_ids.length) return;
  await dbSetCampaignsPending(campaign_ids);
}

/**
 * Mail sent on the day a membership froze.
 *
 * Takes the memberships the nightly decrement actually observed crossing the threshold,
 * rather than re-querying by date. That keeps it to genuine transitions: a backfilled
 * activation_frozen_since must never produce a "your counter just froze" notice for
 * someone who has in fact been frozen for months.
 */
export async function sendActivationFrozenMails(
  dayStr: string,
  membershipIds: number[],
) {
  if (!membershipIds.length) return;
  const templateId = await resolveAutomation(FROZEN_AUTOMATION_KEY);
  if (templateId === null) return;

  const members = await dbGetActivationRecipientsByIds(membershipIds);
  if (!members.length) return;

  const userIds = members
    .map((m) => m.memberships_user?.id)
    .filter((id): id is string => Boolean(id));
  const lastSentAt = await dbGetLastCampaignSentAt(userIds, templateId);
  const recipients = selectSurveyRecipients(members, lastSentAt);

  await sendCampaigns(
    recipients,
    templateId,
    (member) => ({ frozen_since: member.activation_frozen_since }),
    `activation frozen mails for ${dayStr}`,
  );
}

/**
 * Survey mail, sent once a membership has been frozen for ACTIVATION_SURVEY_DELAY_DAYS.
 *
 * Uses a `<=` cutoff rather than an exact date match so that a night on which this job
 * throws is retried the following night — last_cronjob advances regardless of failure, so
 * an exact match would drop that cohort permanently.
 */
export async function sendActivationSurveyMails(today: Date) {
  const templateId = await resolveAutomation(SURVEY_AUTOMATION_KEY);
  if (templateId === null) return;

  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - ACTIVATION_SURVEY_DELAY_DAYS);

  const members = await dbGetMembershipsDueForSurvey(toDateStr(cutoff));
  if (!members.length) return;

  const userIds = members
    .map((m) => m.memberships_user?.id)
    .filter((id): id is string => Boolean(id));
  const lastSentAt = await dbGetLastCampaignSentAt(userIds, templateId);
  const recipients = selectSurveyRecipients(members, lastSentAt);

  const config = useRuntimeConfig();
  const surveyUrls = buildActivationSurveyUrls(config.public.collectivoUrl);

  await sendCampaigns(
    recipients,
    templateId,
    (member) => ({
      frozen_since: member.activation_frozen_since,
      ...surveyUrls,
    }),
    "activation survey mails",
  );
}
