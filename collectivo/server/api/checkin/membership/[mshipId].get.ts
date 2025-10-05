import { readItem } from "@directus/sdk";
import { confirmCheckinUser } from "~~/server/utils/checkin";

export default defineEventHandler(async (event) => {
  confirmCheckinUser(event);
  const mshipId = getRouterParam(event, "mshipId") as string;
  const directus = useDirectusAdmin();
  const mship = await directus.request(
    readItem("memberships", mshipId, {
      fields: [{ memberships_user: ["username", "pronouns"] }],
    }),
  );
  return {
    username: mship.memberships_user.username,
    pronouns: mship.memberships_user.pronouns,
  };
});
