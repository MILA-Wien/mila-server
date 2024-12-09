import { z } from "zod";
import { getShiftOccurrences } from "~/server/utils/shiftsOccurrences";

// This is the main API for the shifts calendar
// It returns all the shifts occurrences within a given timeframe

const querySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  admin: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  shiftID: z.coerce.number().optional(),
});

export default defineEventHandler(async (event) => {
  const params = await getValidatedQuery(event, querySchema.parse);
  const user = event.context.auth as ServerUserInfo;
  if (params.admin && !user.shiftAdmin) {
    throw new Error("Unauthorized");
  }
  return getShiftOccurrences(
    params.from,
    params.to,
    params.admin,
    params.shiftID,
    user.mship ?? undefined,
  );
});
