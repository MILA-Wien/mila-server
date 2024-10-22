import { readItem, updateItem } from "@directus/sdk";

const config = useRuntimeConfig();

const lotzapp_mandant = config.lotzappMandant;
const lotzapp_sepa_id = config.lotzappSepaId;
const lotzapp_transfer_id = config.lotzappTransferId;

const lotzapp_auth =
  "Basic  " +
  Buffer.from(config.lotzappUser + ":" + config.lotzappPassword).toString(
    "base64",
  );

const lotzapp_url = "https://www.lotzapp.org/api/" + lotzapp_mandant + "/";

async function syncItem(item: any) {
  const directus = await useDirectusAdmin();
  const invoice_lotzapp_id = await directus.request();

  await directus.request(
    updateItem("payments_invoices_out", item.id, {
      payments_status: "paid",
    }),
  );
}

export default defineEventHandler(async (event) => {
  // Protect route with API Token
  verifyCollectivoApiToken(event);

  try {
    await useDirectusAdmin();
  } catch (e) {
    console.error("Failed to connect to Directus", e);
  }

  const body = await readBody(event);
  console.log("Syncing lotzapp data: " + body.length + " items");

  // loop through body
  for (const item of body) {
    await syncItem(item);
  }
});
