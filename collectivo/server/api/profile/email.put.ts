import { updateUser } from "@directus/sdk";
import { z } from "zod";
import { text } from "../../../shared/addressSchema";

const schema = z.object({
  email: text().email(),
});

export default defineEventHandler(async (event) => {
  const user = getUserOrThrowError(event);
  const data = await readValidatedBody(event, schema.parse);
  const directus = await useDirectusAdmin();
  await directus.request(updateUser(user.user, { email: data.email }));
});
