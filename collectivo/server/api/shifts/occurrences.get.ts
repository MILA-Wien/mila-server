import { z } from "zod";
import { parseUtcMidnight } from "../../utils/dates";
import { getShiftOccurrences } from "../../utils/shiftsOccurrences";

const querySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  admin: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  shiftID: z.coerce.number().optional(),
  mshipID: z.coerce.number().optional(),
});

export default defineEventHandler(async (event) => {
  const params = await getValidatedQuery(event, querySchema.parse);
  const user = getUserOrThrowError(event);
  let mship = user.mship;

  if (params.admin && !user.shiftAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Unauthorized",
    });
  }

  if (params.mshipID) {
    confirmCheckinUser(event);
    mship = params.mshipID;
  }

  console.log("Fetching occurrences for", mship);

  return await getShiftOccurrences(
    parseUtcMidnight(params.from),
    parseUtcMidnight(params.to),
    params.admin,
    params.shiftID,
    mship,
  );
});
