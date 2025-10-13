import { checkinByCardId } from "~~/server/utils/checkin";

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event, "checkinToken");

  const cardID = getRouterParam(event, "cardID") as string;
  return await checkinByCardId(cardID);
});
