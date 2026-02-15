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
  const mship = await dbGetMembershipUser(membership);
  const userID = mship.memberships_user;

  const mitgliedstag = await dbGetTagByName("Mitglied");

  if (!mitgliedstag) {
    console.log("Mitglied tag not found");
    return;
  }

  const mitgliedstagID = mitgliedstag.id;
  const existing_tag_assignments = await dbGetUserTagAssignments(
    userID,
    mitgliedstagID,
  );

  if (
    memberStatuses.includes(body.payload.memberships_status) &&
    existing_tag_assignments.length == 0
  ) {
    await dbAssignTag(userID, mitgliedstagID);
  } else if (notMemberStatuses.includes(body.payload.memberships_status)) {
    for (const tag of existing_tag_assignments) {
      await dbRemoveTagAssignment(tag.id);
    }
  }
}
