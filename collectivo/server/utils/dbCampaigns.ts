import { createItem, readItems, updateItem, updateItems } from "@directus/sdk";

const directus = useDirectusAdmin();

export async function dbGetAutomation(name: string) {
  const automations = await directus.request(
    readItems("mila_automations", {
      filter: {
        mila_key: { _eq: name },
      },
    }),
  );
  return automations[0] ?? null;
}

export async function dbCreateCampaign(payload: any): Promise<{ id: number }> {
  return await directus.request(
    createItem("messages_campaigns", payload, { fields: ["id"] }),
  ) as unknown as { id: number };
}

export async function dbSetCampaignsPending(ids: number[]) {
  return await directus.request(
    updateItems("messages_campaigns", ids, {
      messages_campaign_status: "pending",
    }),
  );
}

export async function dbSetCampaignPending(id: number) {
  return await directus.request(
    updateItem("messages_campaigns", id, {
      messages_campaign_status: "pending",
    }),
  );
}

// Latest send per recipient for a given template, used to avoid re-sending.
//
// The campaign pipeline already records one messages_messages row per recipient per
// campaign, but nothing has ever read it back - this is the first dedupe guard in the
// codebase.
//
// Counts both "sent" and "pending": a campaign that is queued but not yet delivered (the
// sender serialises behind a global lock and can back up for hours) must not be queued a
// second time the next night, or the member receives N copies once it drains. "failed" is
// deliberately excluded so a genuine delivery failure is retried.
//
// Recipient ids are queried in chunks: the SDK sends filters as a GET query string, and a
// few hundred UUIDs in one `_in` would overflow the request line.
const SENT_LOOKUP_CHUNK_SIZE = 100;

export async function dbGetLastCampaignSentAt(
  userIds: string[],
  templateId: number,
): Promise<Map<string, string>> {
  const lastSent = new Map<string, string>();
  if (!userIds.length) return lastSent;

  for (let i = 0; i < userIds.length; i += SENT_LOOKUP_CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + SENT_LOOKUP_CHUNK_SIZE);
    const rows = (await directus.request(
      readItems("messages_messages", {
        filter: {
          messages_recipient: { _in: chunk },
          messages_message_status: { _in: ["sent", "pending"] },
          messages_campaign: { messages_template: { _eq: templateId } },
        } as any,
        fields: ["messages_recipient", "date_created"] as any[],
        sort: ["-date_created"] as any[],
        limit: -1,
      }),
    )) as unknown as {
      messages_recipient: string | { id: string } | null;
      date_created: string | null;
    }[];

    for (const row of rows) {
      const recipient =
        typeof row.messages_recipient === "string"
          ? row.messages_recipient
          : (row.messages_recipient?.id ?? null);
      if (!recipient || !row.date_created) continue;
      // Sorted newest first, so the first row seen per recipient is the latest.
      if (!lastSent.has(recipient)) lastSent.set(recipient, row.date_created);
    }
  }

  return lastSent;
}
