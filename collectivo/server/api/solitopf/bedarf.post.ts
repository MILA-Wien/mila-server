/*
 * Endpoint used by an organiser (BP/SK/K) to request a subject.
 */
import { createItem } from "@directus/sdk";
import { z } from "zod";

const schema = z.object({
  auszahlung: z.enum(["v300a1", "v50a6"]),
  weitere_unterstuetzung: z.coerce.boolean().optional().default(false),
});

type Schema = z.infer<typeof schema>;

export default defineEventHandler(async (event) => {
  const user = event.context.auth as ServerUserInfo;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const result = await readValidatedBody(event, (query) =>
    schema.safeParse(query),
  );

  if (!result.success) {
    throw result.error.issues;
  }

  const p = result.data;

  try {
    return await postBedarfsmeldung(p, user);
  } catch (e) {
    console.error(e);
    throw e;
  }
});

async function postBedarfsmeldung(p: Schema, u: SessionUser) {
  const directus = useDirectusAdmin();

  await directus.request(
    createItem("bedarfsmeldung_solitopf", {
      membership: u.mship,
      auszahlung: p.auszahlung,
      weitere_unterstuetzung: p.weitere_unterstuetzung,
    }),
  );
}
