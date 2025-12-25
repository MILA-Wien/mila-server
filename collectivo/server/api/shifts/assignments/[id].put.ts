import { z } from "zod";

const bodySchema = z.object({
  shifts_to: z.string().optional(),
});

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

  const body = await readValidatedBody(event, bodySchema.parse);
  return await updateShiftAssignment(parseInt(assignmentId), body);
});
