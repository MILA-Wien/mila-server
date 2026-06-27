// Webhook called by a Directus flow when a campaign's status changes.
// It does not send anything itself: it merely kicks the durable email drain
// (see server/utils/campaignSender.ts), which sends from the persisted queue
// of pending messages, one email per NUXT_EMAIL_SMTP_DELAY_MS, as a single
// global stream. Returns immediately so the flow does not block.

export default defineEventHandler(async (event) => {
  try {
    return await handleCampaignUpdate(event);
  } catch (error) {
    console.log("Error in campaigns_send.post.ts");
    throw error;
  }
});

async function handleCampaignUpdate(event: any) {
  // Protect route with API Token
  verifyCollectivoApiToken(event);
  const body = await readBody(event);

  // Ignore requests where the new campaign status is not "pending"
  if (!body.payload || body.payload.messages_campaign_status !== "pending") {
    return { queued: false };
  }

  // Resume/continue the single drain. It will pick up every pending campaign
  // from the DB, so we do not need the specific campaign key(s) here.
  kickEmailDrain();

  return { queued: true };
}
