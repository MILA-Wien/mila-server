/**
 * Handles the API request for retrieving shift occurrences within a specified timeframe.
 *
 * @param event - The event object containing the request context and parameters.
 *
 * @returns A promise that resolves to the shift occurrences within the specified timeframe.
 *
 * @throws {Error} If the user is not authorized to access the requested data.
 *
 * @typedef {Object} QueryParams
 * @property {Date} from - The start date of the timeframe.
 * @property {Date} to - The end date of the timeframe.
 * @property {boolean} [admin] - Whether to include sensible information in the response.
 * @property {number} [shiftID] - The ID of the specific shift to retrieve occurrences for.
 */
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
});

export default defineEventHandler(async (event) => {
  const params = await getValidatedQuery(event, querySchema.parse);
  const user = event.context.auth as ServerUserInfo;
  if (params.admin && !user.shiftAdmin) {
    throw new Error("Unauthorized");
  }

  return getShiftOccurrences(
    parseUtcMidnight(params.from),
    parseUtcMidnight(params.to),
    params.admin,
    params.shiftID,
    user.mship ?? undefined,
  );
});
