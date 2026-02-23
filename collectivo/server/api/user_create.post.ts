// If a new user is created ...
// - Make it a keycloak user
// - Set external identifier to match email
// - Set role to NutzerInnen
export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  const body = await readBody(event);
  const roleID = await dbGetRoleByName("NutzerInnen");
  const useKeycloak = useRuntimeConfig().public.useKeycloak;

  if (!useKeycloak) {
    await dbUpdateUser(body.key, { role: roleID });
    return;
  }

  await dbUpdateUser(body.key, {
    role: roleID,
    provider: "keycloak",
    external_identifier: body.payload.email,
  });
});
