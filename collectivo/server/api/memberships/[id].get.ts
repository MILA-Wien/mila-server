export default defineEventHandler(async (event) => {
  getUserOrThrowError(event);

  const membershipId = getRouterParam(event, "id");
  if (!membershipId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing membership ID",
    });
  }

  return await getMembershipById(parseInt(membershipId));
});
