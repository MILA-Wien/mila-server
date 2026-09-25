/*
 * This function handles sending warnings before shopping privileges expire.
 * It is called by the daily cronjob with the memberships whose shift counter just
 * reached the warning point (-14).
 * Requires an active automation with the name "shopping_expiration_warning".
 */

import { dbGetShoppingWarningRecipients } from "./dbContent";
import { FREEZE_THRESHOLD } from "../../shared/activationFreeze";

export async function sendShoppingExpirationWarnings(membershipIds: number[]) {
  const automation = await dbGetAutomation("shopping_expiration_warning");

  if (!automation) {
    throw new Error("Automation not found");
  }

  if (!automation.mila_active) {
    throw new Error("Automation is not active");
  }

  await sendWarningsInner(membershipIds, automation);
}

async function sendWarningsInner(membershipIds: number[], automation: any) {
  const payloads: any[] = [];

  for (const { userId, shiftsCounter } of await dbGetShoppingWarningRecipients(
    membershipIds,
  )) {
    // Days left counted from the current counter, so a catch-up run over several days
    // (or a holiday since the warning point) still states the right number.
    const remaining_days = shiftsCounter - FREEZE_THRESHOLD;
    if (remaining_days <= 0) {
      continue; // already frozen; the activation_frozen mail covers that
    }

    payloads.push([
      {
        messages_recipients: {
          create: [
            {
              directus_users_id: {
                id: userId,
              },
              messages_campaigns_id: "+",
            },
          ],
        },
        messages_context: {
          remaining_days,
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
