import { z } from "zod";

export async function readDataorThrowError(event: any, schema: z.ZodTypeAny) {
  const result = await readValidatedBody(event, (query) =>
    schema.safeParse(query),
  );

  if (!result.success) {
    throw result.error.issues;
  }

  return result.data;
}
