import { z } from "zod";
import { createItem } from "@directus/sdk";

const schema = z.object({
  name: z.string().min(1),
  wunsch: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse);
  const user = getMemberOrThrowError(event);
  const directus = useDirectusAdmin();
  console.log("Creating product request", body, "from user", user);
  await directus.request(
    createItem("product_requests", {
      name: body.name,
      wunsch: body.wunsch,
      wunsch_von: user.mship,
    }),
  );
});
