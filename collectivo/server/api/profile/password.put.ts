import { updateUser } from "@directus/sdk";
import { z } from "zod";

const schema = z.object({
  password: z.string(),
});

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  if (config.public.useKeycloak) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password changes must be done via Keycloak account management.",
    });
  }
  const user = getUserOrThrowError(event);
  const data = await readValidatedBody(event, schema.parse);
  const directus = await useDirectusAdmin();
  await directus.request(updateUser(user.user, { password: data.password }));
});
