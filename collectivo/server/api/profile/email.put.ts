import { updateUser } from "@directus/sdk";
import { z } from "zod";
import { email } from "../../../shared/addressSchema";

const schema = z.object({
  email: email(),
});

export default defineEventHandler(async (event) => {
  const user = getUserOrThrowError(event);
  const data = await readValidatedBody(event, schema.parse);
  const directus = await useDirectusAdmin();
  await directus.request(updateUser(user.user, { email: data.email }));
});
