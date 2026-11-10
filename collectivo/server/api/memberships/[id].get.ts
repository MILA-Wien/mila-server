export default defineEventHandler(async (event) => {
  const user = getUserOrThrowError(event);

  // Only the admin shift dialogs need other members' details (incl. names of members
  // who chose to hide them).
  if (!user.shiftAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  const membershipId = getRouterParam(event, "id");
  if (!membershipId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing membership ID",
    });
  }

  return await dbGetMembershipById(parseInt(membershipId));
});
