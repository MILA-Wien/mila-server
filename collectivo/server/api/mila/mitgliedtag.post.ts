import { createItem, readItem, readItems, deleteItem } from "@directus/sdk";

const mitgliedstagID = 43;

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  console.log("Autotag Mitglied");

  if (config.public.authService !== "keycloak") {
    return;
  }

  try {
    await refreshDirectus();
  } catch (e) {
    logger.error("Failed to connect to Directus", e);
  }

  verifyCollectivoApiToken(event);
  const body = await readBody(event);

  body.keys = body.keys || [body.key];

  if (!("memberships_status" in body.payload)) {
    return;
  }

  for (const key of body.keys) {
    assignTag(body, key);
  }
});

async function assignTag(body: any, membership: string) {
  const directus = await useDirectusAdmin();
  const mship = await directus.request(
    readItem("memberships", membership, { fields: ["memberships_user"] }),
  );
  const userID = mship.memberships_user;

  const memberStatuses = ["approved", "in-exclusion", "in-cancellation"];
  const notMemberStatuses = ["draft", "applied", "ended"];

  const extags = await directus.request(
    readItems("collectivo_tags_directus_users", {
      filter: {
        collectivo_tags_id: {
          _eq: mitgliedstagID,
        },
        directus_users_id: {
          _eq: userID,
        },
      },
    }),
  );

  if (memberStatuses.includes(body.payload.memberships_status) && !extags) {
    await directus.request(
      createItem("collectivo_tags_directus_users", {
        collectivo_tags_id: mitgliedstagID,
        directus_users_id: userID,
      }),
    );
    console.log("Mitglied tag assigned");
  } else if (notMemberStatuses.includes(body.payload.memberships_status)) {
    for (const tag of extags) {
      await directus.request(
        deleteItem("collectivo_tags_directus_users", tag.id),
      );
      console.log("Mitglied tag removed");
    }
  }
}
