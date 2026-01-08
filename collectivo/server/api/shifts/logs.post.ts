import { z } from "zod";

const bodySchema = z.object({
  type: z.string(),
  mshipId: z.number(),
  date: z.string(),
  shiftId: z.number().optional(),
  score: z.number().optional(),
  note: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const user = getUserOrThrowError(event);

  if (!user.shiftAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  const body = await readValidatedBody(event, bodySchema.parse);
  return await createShiftLog(
    body.type,
    body.mshipId,
    body.date,
    body.shiftId,
    body.score,
    body.note,
  );
});
