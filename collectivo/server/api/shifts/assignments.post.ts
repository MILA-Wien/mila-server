import { z } from "zod";

const bodySchema = z.object({
  shifts_membership: z.coerce.number(),
  shifts_shift: z.coerce.number(),
  shifts_from: z.string(),
  shifts_is_regular: z.boolean(),
  shifts_to: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const user = getMemberOrThrowError(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  // Users can only create assignments for themselves unless they are shift admins
  if (body.shifts_membership !== user.mship && !user.shiftAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  return await createShiftAssignment(body);
});
