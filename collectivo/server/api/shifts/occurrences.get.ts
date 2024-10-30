import { z } from "zod";

const inputSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export default defineEventHandler(async (event) => {
  const params = await getValidatedQuery(event, inputSchema.parse);
  console.log("hello2", params);
  console.log("user is ", event.context.auth);
  return {
    hello: "world",
  };
});
