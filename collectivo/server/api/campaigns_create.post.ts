import { createItem, readItems, updateItem } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  try {
    return await createCampaign(event);
  } catch (error) {
    console.log("Error in campaigns_create.post.ts");
    throw error;
  }
});

async function createCampaign(event: any) {
  // Protect route with API Token
  verifyCollectivoApiToken(event);
  const body = await readBody(event);
  console.log("Received request in campaigns_create.post.ts", body);

  if (!body.automation_name || !body.user_ids) {
    throw new Error("Missing required fields");
  }

  const directus = await useDirectusAdmin();

  const automations = await directus.request(
    readItems("mila_automations", {
      filter: {
        mila_key: {
          _eq: body.automation_name,
        },
      },
    }),
  );

  if (!automations.length) {
    throw new Error("Automation not found");
  }

  const automation = automations[0];

  if (!automation.mila_active) {
    throw new Error("Automation is not active");
  }

  const createList = [];

  if (body.user_ids?.length) {
    for (const user_id of body.user_ids) {
      createList.push({
        directus_users_id: {
          id: user_id,
        },
        messages_campaigns_id: "+",
      });
    }
  }

  delete body.user_ids;
  delete body.automation_name;

  if (createList.length) {
    const campaign = await directus.request(
      createItem("messages_campaigns", {
        messages_template: automation.mila_template,
        messages_recipients: {
          create: createList,
        },
        messages_context: body,
      }),
    );

    // Send campaign
    await directus.request(
      updateItem("messages_campaigns", campaign.id, {
        messages_campaign_status: "pending",
      }),
    );
  }
}
