import { z } from "zod";
import {
  isValidPersonName,
  PERSON_NAME_MAX_LENGTH,
} from "../../../shared/personName";

// Synced to Keycloak firstName/lastName - see shared/personName.ts.
const personName = z
  .string()
  .max(PERSON_NAME_MAX_LENGTH)
  .refine(isValidPersonName, "Name contains characters that are not allowed");

const schema = z.object({
  username: personName.optional(),
  username_last: personName.optional(),
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
