import { createItem, updateUser } from "@directus/sdk";
import { z } from "zod";

const schema = z.object({
  username: z.string().optional(),
  pronouns: z.string().optional(),
  hide_name: z.boolean().optional(),
  send_notifications: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const user = getMemberOrThrowError(event);
  const data = await readValidatedBody(event, schema.parse);
  const directus = useDirectusAdmin();
  await directus.request(
    updateUser(user.user, {
      username: data.username,
      pronouns: data.pronouns,
      hide_name: data.hide_name,
      send_notifications: data.send_notifications,
    }),
  );
});
