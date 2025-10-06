import { z } from "zod";
import { createItem } from "@directus/sdk";

const schema = z.object({
  shifts_membership: z.number(),
  shifts_shift: z.number(),
  shifts_from: z.string(),
  shifts_is_regular: z.boolean().optional(),
  checkin_mode: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse);
  const user = getUserOrThrowError(event);

  if (user.shiftAdmin) {
    // ok
  } else if (body.checkin_mode) {
    confirmCheckinUser(event);
  } else {
    if (user.mship !== body.shifts_membership) {
      throw createError({
        statusCode: 403,
        statusMessage: "Unauthorized",
      });
    }
  }

  console.log("Creating shift assignment", body, "from user", user);

  const directus = useDirectusAdmin();
  await directus.request(
    createItem("shifts_assignments", {
      shifts_membership: body.shifts_membership,
      shifts_shift: body.shifts_shift,
      shifts_from: body.shifts_from,
      shifts_is_regular: body.shifts_is_regular,
    }),
  );
});
