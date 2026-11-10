import { z } from "zod";
import { checkAbsenceAuthorization } from "../../../shared/absenceAuthorization";

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

  // Users can only create absences for themselves unless they are shift admins, and a
  // named assignment must belong to the absence's membership (see absenceAuthorization).
  const assignmentMembership =
    body.shifts_assignment === undefined
      ? undefined
      : await dbGetAssignmentMembership(body.shifts_assignment);
  const authorization = checkAbsenceAuthorization({
    caller: user,
    absenceMembership: body.shifts_membership,
    assignmentMembership,
  });
  if (authorization === "forbidden") {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  // Holidays must reach a configurable minimum duration to prevent misuse.
  // This applies to everyone using this endpoint (the /shifts self-service
  // modal); admins enter holidays for other members directly in Directus.
  if (body.shifts_is_holiday) {
    const settings = await dbGetSettings();
    const minDays = settings.shift_holiday_min_days ?? 14;
    const durationDays = inclusiveDaysBetween(
      new Date(body.shifts_from),
      new Date(body.shifts_to),
    );

    if (durationDays < minDays) {
      throw createError({
        statusCode: 400,
        statusMessage: `Holiday must be at least ${minDays} days long`,
      });
    }
  }

  return await dbCreateAbsence(body);
});
