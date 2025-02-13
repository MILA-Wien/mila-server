import { updateUser, updateItem } from "@directus/sdk";

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

interface LotzappResponse {
  ID: string;
}

interface CollectivoInvoice {
  id: number;
  lotzapp_id: string;
  payments_status: string;
  payments_recipient_user: UserProfile;
  payments_date_issued: string;
  payments_entries: {
    payments_quantity: number;
    payments_price: number;
  }[];
}

export default defineEventHandler(async (event) => {
  // Protect route with API Token
  verifyCollectivoApiToken(event);
  await useDirectusAdmin();

  const body = await readBody(event);
  console.log("Syncing lotzapp data: " + body.length + " items");

  // loop through body
  for (const item of body) {
    await syncItem(item);
  }
});

async function syncItem(item: CollectivoInvoice) {
  const user = item.payments_recipient_user;
  const directus = await useDirectusAdmin();

  user.lotzapp_id = await createOrUpdateLotzappUser(user);

  if (
    user.lotzapp_id == null ||
    user.lotzapp_id == "" ||
    user.lotzapp_id == undefined
  ) {
    console.log("Aborting since no lotzapp id was returned");
    return;
  }

  await directus.request(
    updateUser(user.id, {
      lotzapp_id: user.lotzapp_id,
    }),
  );

  const invoiceID = await createLotzappInvoice(user, item);

  if (invoiceID == null || invoiceID == "" || invoiceID == undefined) {
    console.log("Aborting since no invoice id was returned");
    return;
  }

  await directus.request(
    updateItem("payments_invoices_out", item.id, {
      lotzapp_id: invoiceID,
    }),
  );
}

async function createOrUpdateLotzappUser(user: UserProfile) {
  console.log("Creating or updating user in Lotzapp: " + user.first_name);

  const data = {
    name2: user.first_name,
    name: user.last_name,
    typ: user.memberships_person_type == "legal" ? "0" : "1",
    anschrift:
      (user.memberships_street ?? "") +
      " " +
      (user.memberships_streetnumber ?? "") +
      " " +
      (user.memberships_stair ?? "") +
      " " +
      (user.memberships_door ?? ""),
    plz: user.memberships_postcode,
    ort: user.memberships_city,
    bankeinzug: user.payments_type == "sepa" ? "1" : "0",
    mail: [{ email: user.email }],
    bankverbindungen: [{ IBAN: user.payments_account_iban }],
    kunde: "-1",
  };

  const endpoint = lotzapp_url + "adressen/";

  if (user.lotzapp_id == null) {
    const res = (await $fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: lotzapp_auth,
      },
      body: JSON.stringify(data),
    })) as LotzappResponse;

    console.log("Lotzapp address created new: " + res.ID);
    return res.ID;
  }

  const endpointWithID = endpoint + user.lotzapp_id + "/";

  const resGet = (await $fetch(endpointWithID, {
    method: "GET",
    headers: {
      Authorization: lotzapp_auth,
    },
  })) as LotzappResponse;

  if (!resGet) {
    // ID does not exist, create new
    const res = (await $fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: lotzapp_auth,
      },
      body: JSON.stringify(data),
    })) as LotzappResponse;

    console.log(
      "Lotzapp address created new, as old id not found: " + user.lotzapp_id,
      +"new id is " + res.ID,
    );

    return res.ID;
  }

  // ID exists, update
  try {
    delete data.kunde;
    await $fetch(endpointWithID, {
      method: "PUT",
      headers: {
        Authorization: lotzapp_auth,
      },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.log("Error updating Lotzapp address: " + e);
    console.log("Payload: " + JSON.stringify(data));
    throw e;
  }

  console.log("Lotzapp address updated for id " + user.lotzapp_id);
  return user.lotzapp_id;
}

// INVOICE

async function createLotzappInvoice(
  user: UserProfile,
  invoice: CollectivoInvoice,
) {
  if (invoice.payments_status !== "pending") {
    console.log("skipping invoice because not pending");
    return null; // invoice should not be created
  }

  // # Prepare invoice data for lotzapp
  const zahlungsmethode =
    user.payments_type == "sepa" ? lotzapp_sepa_id : lotzapp_transfer_id;

  const entry = invoice.payments_entries[0];

  const data = {
    datum: invoice.payments_date_issued,
    adresse: user.lotzapp_id,
    zahlungsmethode: zahlungsmethode,
    positionen: [
      {
        name: "Genossenschaftsanteil",
        wert: entry.payments_quantity.toString(),
        einheit: "mal",
        netto: entry.payments_price.toString().slice(0, -2),
      },
    ],
  };

  const endpoint = lotzapp_url + "ar/";

  if (invoice.lotzapp_id == null) {
    const res = (await $fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: lotzapp_auth,
      },
      body: JSON.stringify(data),
    })) as LotzappResponse;

    console.log("Lotzapp invoice created new: " + res.ID);
    return res.ID;
  }

  const endpointWithID = endpoint + invoice.lotzapp_id + "/";

  const resGet = (await $fetch(endpointWithID, {
    method: "GET",
    headers: {
      Authorization: lotzapp_auth,
    },
  })) as LotzappResponse;

  if (!resGet) {
    // ID does not exist, create new
    const res = (await $fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: lotzapp_auth,
      },
      body: JSON.stringify(data),
    })) as LotzappResponse;

    console.log(
      "Lotzapp invoice created new, as old id not found: " + user.lotzapp_id,
    );

    return res.ID;
  }

  // ID exists, skip
  console.log(
    "Skipping as Lotzapp invoice already exists for id " + invoice.lotzapp_id,
  );

  return null;
}
