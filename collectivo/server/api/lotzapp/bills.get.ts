import { z } from "zod";
import https from "https";
import axios from "axios";

const config = useRuntimeConfig();
const accountIDs = [10, 12, 13];
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
  const input_params = await getValidatedQuery(event, querySchema.parse);
  const from_date = input_params.from;
  const to_date = input_params.to;
  const user = getUserOrThrowError(event);

  if (!user.lotzappId) {
    throw new Error("NO_LOTZAPP_ID");
  }

  const customer_id = user.lotzappId;

  const buildUrl = (accountID: number) => {
    const params = new URLSearchParams({
      customer_id: String(customer_id),
    });
    if (from_date) params.append("from_date", String(from_date));
    if (to_date) params.append("to_date", String(to_date));

    return `https://api.lotzapp.org/account/account/${accountID}/receipt?${params.toString()}`;
  };

  // TODO Temporary unsafe solution
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  // Fetch all in parallel
  const results = await Promise.allSettled(
    accountIDs.map(async (id) => {
      const url = buildUrl(id);
      console.log(url);
      try {
        // const res = await $fetch(url, {
        //   method: "GET",
        //   headers: {
        //     Authorization: lotzapp_auth,
        //     "x-client-id": lotzapp_mandant,
        //   },
        // });
        const res = await axios.get(url, {
          httpsAgent,
          headers: {
            Authorization: lotzapp_auth,
            "x-client-id": lotzapp_mandant,
          },
        });
        return res.data;
      } catch (err: any) {
        console.error(`[FAIL] Account ${id}: ${err?.message || err}`);
        throw err;
      }
    }),
  );

  const data = results
    .filter((r) => r.status === "fulfilled")
    .map((r: any) => r.value)
    .flat();

  return combineByExternalNumber(data);
});

function combineByExternalNumber(list: any[]) {
  const filtered = list.filter((item) => item.name === "Verkauf");

  const grouped = {};

  for (const item of filtered) {
    const key = item.external_number;
    if (!grouped[key]) {
      grouped[key] = { ...item, positions: [...item.positions] };
    } else {
      grouped[key].total += item.total;
      grouped[key].positions.push(...item.positions);
    }
  }

  const data = Object.values(grouped);

  data.sort((a, b) => {
    const ta = Date.parse(a.timestamp ?? "") || 0;
    const tb = Date.parse(b.timestamp ?? "") || 0;
    return tb - ta;
  });

  return data;
}
