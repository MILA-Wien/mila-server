import { checkinByMshipId, confirmCheckinUser } from "~~/server/utils/checkin";

export default defineEventHandler(async (event) => {
  confirmCheckinUser(event);
  const mshipId = getRouterParam(event, "mshipId");
  await checkinByMshipId(Number(mshipId));
  return { success: true };
});
