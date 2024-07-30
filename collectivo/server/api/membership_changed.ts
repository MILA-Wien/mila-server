import { createItem, readItem, readItems, deleteItem } from "@directus/sdk";

const memberStatuses = ["approved", "in-exclusion", "in-cancellation"];
const notMemberStatuses = ["draft", "applied", "ended"];

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  const body = await readBody(event);

  body.keys = body.keys || [body.key];

  if (
    !("memberships_status" in body.payload) ||
    (body.event.includes(".create") &&
      notMemberStatuses.includes(body.payload.memberships_status))
  ) {
    return;
  }
  console.log(body.keys);
  for (const key of body.keys) {
    try {
      await assignTag(body, key);
    } catch (e) {
      console.error("Error assigning tag", e);
    }
  }
});

async function assignTag(body: any, membership: string) {
  const directus = await useDirectusAdmin();

  const mship = await directus.request(
    readItem("memberships", membership, { fields: ["memberships_user"] }),
  );

  const userID = mship.memberships_user;

  const mitgliedstagIDs = await directus.request(
    readItems("collectivo_tags", {
      filter: {
        tags_name: {
          _eq: "Mitglied",
        },
      },
    }),
  );

  if (mitgliedstagIDs.length < 1) {
    console.log("Mitglied tag not found");
    return;
  }

  const mitgliedstagID = mitgliedstagIDs[0].id;

  const existing_tag_assignments = await directus.request(
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

  if (
    memberStatuses.includes(body.payload.memberships_status) &&
    existing_tag_assignments.length == 0
  ) {
    await directus.request(
      createItem("collectivo_tags_directus_users", {
        collectivo_tags_id: mitgliedstagID,
        directus_users_id: userID,
      }),
    );
  } else if (notMemberStatuses.includes(body.payload.memberships_status)) {
    for (const tag of existing_tag_assignments) {
      await directus.request(
        deleteItem("collectivo_tags_directus_users", tag.id),
      );
    }
  }
}
