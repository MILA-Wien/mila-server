import { readMe } from "@directus/sdk";

export default defineEventHandler(async (_event) => {
  let directusHealthy = true;

  try {
    const directus = await useDirectusAdmin();
    await directus.request(readMe());
  } catch (e) {
    directusHealthy = false;
    console.error("Directus refresh error", e);
  }

  return {
    healthy: {
      collectivo: true,
      directus: directusHealthy,
    },
  };
});
