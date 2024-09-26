import { readRoles, updateUser } from "@directus/sdk";

// If a new user is created ...
// - Make it a keycloak user
// - Set external identifier to match email
// - Set role to NutzerInnen
export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  const body = await readBody(event);
  const directus = await useDirectusAdmin();
  const roleID = await getRole("NutzerInnen");

  await directus.request(
    updateUser(body.key, {
      role: roleID,
      provider: "keycloak",
      external_identifier: body.payload.email,
    }),
  );
});

async function getRole(name: string) {
  const directus = await useDirectusAdmin();

  const membersRoles = await directus.request(
    readRoles({
      filter: {
        name: { _eq: name },
      },
    }),
  );

  if (membersRoles.length < 1) {
    throw new Error(name + " role not found");
  }

  return membersRoles[0].id;
}
