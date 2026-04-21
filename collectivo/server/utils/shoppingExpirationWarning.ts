/*
 * This function handles sending warnings before shopping privileges expire.
 * It is called by a directus cron job.
 * It sends warnings to users with a shift counter matching the given parameter.
 * Requires an active automation with the name "shopping_expiration_warning".
 */

import { dbGetActiveUserIdsByShiftcounter } from "./dbContent";

export async function sendShoppingExpirationWarnings(shift_counter: number) {
  const automation = await dbGetAutomation("shopping_expiration_warning");

  if (!automation) {
    throw new Error("Automation not found");
  }

  if (!automation.mila_active) {
    throw new Error("Automation is not active");
  }

  await sendWarningsInner(shift_counter, automation);
}

async function sendWarningsInner(shift_counter: number, automation: any) {
  const payloads: any[] = [];

  for (const user_id of await dbGetActiveUserIdsByShiftcounter(shift_counter)) {
    payloads.push([
      {
        messages_recipients: {
          create: [
            {
              directus_users_id: {
                id: user_id,
              },
              messages_campaigns_id: "+",
            },
          ],
        },
        messages_context: {
          remaining_days: shift_counter + 28,
        },
        messages_template: automation.mila_template,
      },
    ]);
  }

  const campaign_ids = [];
  console.log("Sending warnings", payloads.length);

  for (const payload of payloads) {
    const campaign = (await dbCreateCampaign(payload)) as any;
    campaign_ids.push(campaign[0].id);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (!campaign_ids.length) {
    return;
  }

  await dbSetCampaignsPending(campaign_ids);
}
