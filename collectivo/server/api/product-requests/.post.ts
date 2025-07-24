import { z } from "zod";
import { createItem } from "@directus/sdk";

const schema = z.object({
  name: z.string().min(1),
  wunsch: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse);
  const user = event.context.auth as ServerUserInfo;

  if (!user.mship) {
    throw new Error("Unauthorized");
  }

  const directus = useDirectusAdmin();

  try {
    await directus.request(
      createItem("product_requests", {
        name: body.name,
        wunsch: body.wunsch,
        wunsch_von: user.mship,
      }),
    );
  } catch (error) {
    console.error("Error creating product request:", error);
    throw new Error("Failed to create product request");
  }
});
