import { z } from "zod";

const querySchema = z.object({
  date: z.string(),
  shiftId: z.coerce.number(),
});

export default defineEventHandler(async (event) => {
  const user = getUserOrThrowError(event);

  if (!user.shiftAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  const params = await getValidatedQuery(event, querySchema.parse);
  return await getShiftLogsForShift(params.date, params.shiftId);
});
