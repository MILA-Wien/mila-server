import { z } from "zod";

const schema = z.object({
  auszahlung: z.enum(["v300a1", "v50a6"]),
  weitere_unterstuetzung: z.coerce.boolean().optional().default(false),
});

export default defineEventHandler(async (event) => {
  const user = getMemberOrThrowError(event);
  const data = await readValidatedBody(event, schema.parse);
  await dbCreateSolitopfRequest({
    membership: user.mship,
    auszahlung: data.auszahlung,
    weitere_unterstuetzung: data.weitere_unterstuetzung,
  });
});
