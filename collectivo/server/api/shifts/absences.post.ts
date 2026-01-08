import { z } from "zod";

const bodySchema = z.object({
  shifts_membership: z.number(),
  shifts_from: z.string(),
  shifts_to: z.string(),
  shifts_is_holiday: z.boolean().optional(),
  shifts_is_for_all_assignments: z.boolean().optional(),
  shifts_assignment: z.number().optional(),
  shifts_status: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const user = getMemberOrThrowError(event);
  const body = await readValidatedBody(event, bodySchema.parse);

  // Users can only create absences for themselves unless they are shift admins
  if (body.shifts_membership !== user.mship && !user.shiftAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  return await createShiftAbsence(body);
});
