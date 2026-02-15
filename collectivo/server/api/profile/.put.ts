import { z } from "zod";

const schema = z.object({
  username: z.string().optional(),
  username_last: z.string().optional(),
  pronouns: z.string().optional(),
  hide_name: z.boolean().optional(),
  send_notifications: z.boolean().optional(),
  buddy_status: z.enum(["need_buddy", "is_buddy", "keine_angabe"]).optional(),
  buddy_details: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const user = getMemberOrThrowError(event);
  const data = await readValidatedBody(event, schema.parse);
  await dbUpdateUser(user.user, data);
});
