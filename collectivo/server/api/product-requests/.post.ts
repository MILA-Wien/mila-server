import { z } from "zod";
import { createItem } from "@directus/sdk";

const querySchema = z.object({
  wunsch: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, querySchema.parse);
  const user = event.context.auth as ServerUserInfo;

  if (!user.mship) {
    throw new Error("Unauthorized");
  }

  const directus = useDirectusAdmin();

  try {
    await directus.request(
      createItem("sortimentswuensche", {
        wunsch: body.wunsch,
        wunsch_von: user.mship,
      }),
    );
  } catch (error) {
    console.error("Error creating product request:", error);
    throw new Error("Failed to create product request");
  }
});
