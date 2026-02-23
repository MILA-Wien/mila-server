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

export async function dbCreateCampaign(payload: any) {
  return await directus.request(
    createItem("messages_campaigns", payload, { fields: ["id"] }),
  );
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
