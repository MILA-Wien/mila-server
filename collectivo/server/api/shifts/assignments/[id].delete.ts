export default defineEventHandler(async (event) => {
  const user = getUserOrThrowError(event);

  if (!user.shiftAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  const assignmentId = getRouterParam(event, "id");
  if (!assignmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing assignment ID",
    });
  }

  return await deleteShiftAssignment(parseInt(assignmentId));
});
