import type { H3Event } from "h3";

interface RequestBody {
  automation_name?: string;
  user_ids?: string[];
  draft?: boolean;
}

export default defineEventHandler(async (event) => {
  try {
    return await createCampaign(event);
  } catch (error) {
    console.log("Error in campaigns_create.post.ts");
    console.error(error);
    throw error;
  }
});

async function createCampaign(event: H3Event) {
  verifyCollectivoApiToken(event);
  const body = await readBody(event);

  if (!body.automation_name || !body.user_ids) {
    throw new Error("Missing required fields");
  }

  if (Array.isArray(body.automation_name)) {
    for (const name of body.automation_name) {
      try {
        await createCampaignSingle(body, name);
      } catch (error) {
        console.log("Skipping automation", name, error);
      }
    }
  } else {
    await createCampaignSingle(body, body.automation_name);
  }
}

async function createCampaignSingle(
  body: RequestBody,
  automation_name: string,
) {
  const automation = await dbGetAutomation(automation_name);

  if (!automation) {
    console.log(`Automation not found: ${automation_name}`);
    return;
  }

  if (!automation.mila_active) {
    console.log(`Automation not active: ${automation_name}`);
    return;
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
    const campaign = await dbCreateCampaign({
      messages_template: automation.mila_template,
      messages_recipients: {
        create: createList,
      },
      messages_context: body,
    });

    // Send campaign
    if (!body.draft) {
      await dbSetCampaignPending(campaign.id);
    }
  }
}
