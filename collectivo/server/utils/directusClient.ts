import { createDirectus, staticToken, rest } from "@directus/sdk";

const config = useRuntimeConfig();
const directus = createDirectus<CollectivoSchema>(config.public.directusUrl)
  .with(staticToken(config.directusAdminToken))
  .with(rest());

export function useDirectusAdmin() {
  return directus;
}
