import { z } from "zod";

const config = useRuntimeConfig();

const lotzapp_mandant = config.lotzappMandant;
const lotzapp_auth =
  "Basic  " +
  Buffer.from(config.lotzappUser + ":" + config.lotzappPassword).toString(
    "base64",
  );

const querySchema = z.object({
  from: z.string(),
  to: z.string(),
});

export default defineEventHandler(async (event) => {
  console.log("Hey :)");

  const input_params = await getValidatedQuery(event, querySchema.parse);
  const from_date = input_params.from;
  const to_date = input_params.to;
  const user = getUserOrThrowError(event);

  if (!user.lotzappId) {
    throw new Error("NO_LOTZAPP_ID");
  }

  const customer_id = user.lotzappId;

  console.log("Heyo :)", user.lotzappId);
  console.log("lotzapp mand:", lotzapp_mandant);
  console.log("lotzapp auth:", lotzapp_auth);

  // Helper: build URL for each account
  const buildUrl = (accountID: number) => {
    const params = new URLSearchParams({
      customer_id: String(customer_id),
    });
    // if (from_date) params.append("from_date", String(from_date));
    // if (to_date) params.append("to_date", String(to_date));

    return `https://api.lotzapp.org/account/account/${accountID}/receipt?${params.toString()}`;
  };

  const accountIDs = [10]; //, 12, 13];

  // Fetch all in parallel
  const results = await Promise.allSettled(
    accountIDs.map(async (id) => {
      const url = buildUrl(id);
      console.log(url);
      try {
        const res = await $fetch(url, {
          method: "GET",
          headers: {
            Authorization: lotzapp_auth,
            "x-client-id": lotzapp_mandant,
          },
        });
        console.log(
          `[OK] Account ${id}: received ${Array.isArray(res) ? res.length : 1} items`,
        );
        return res;
      } catch (err: any) {
        console.error(`[FAIL] Account ${id}: ${err?.message || err}`);
      }
    }),
  );

  // Collect successful responses
  const data = results
    .filter((r) => r.status === "fulfilled")
    .map((r: any) => r.value)
    .flat(); // flatten if arrays

  // Optional: sum numeric fields (if needed)
  // e.g. total amount:
  // const total = data.reduce((sum, item) => sum + (item.amount || 0), 0)

  return data;
});
