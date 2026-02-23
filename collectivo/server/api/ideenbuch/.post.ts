import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  wunsch: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse);
  const user = getMemberOrThrowError(event);
  console.log("Creating product request", body, "from user", user);
  await dbCreateProductRequest({
    name: body.name,
    wunsch: body.wunsch,
    wunsch_von: user.mship,
  });
});
