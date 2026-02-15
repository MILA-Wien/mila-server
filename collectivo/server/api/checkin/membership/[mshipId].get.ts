import { confirmCheckinUser } from "~~/server/utils/checkin";

export default defineEventHandler(async (event) => {
  confirmCheckinUser(event);
  const mshipId = getRouterParam(event, "mshipId") as string;
  const mship = await dbGetCheckinMembershipProfile(mshipId);
  return {
    username:
      mship.memberships_user.username +
      " " +
      mship.memberships_user.username_last,
    pronouns: mship.memberships_user.pronouns,
  };
});
