// Compares member card RFIDs in the Studio with LotzApp and records the result on each
// membership. Called by the Directus flow "RFID mit Lotzapp prüfen" (issue #148).
// Reports only: neither the Studio nor LotzApp card numbers are ever changed.

import { readItems, updateItemsBatch } from "@directus/sdk";
import { z } from "zod";
import {
  buildLotzappCardIndex,
  checkMembershipCard,
  type LotzappAddressCards,
  type RfidCheckStatus,
} from "../../../shared/rfidCheck";

const config = useRuntimeConfig();

const lotzapp_auth =
  "Basic  " +
  Buffer.from(config.lotzappUser + ":" + config.lotzappPassword).toString(
    "base64",
  );

const lotzapp_url =
  "https://www.lotzapp.org/api/" + config.lotzappMandant + "/";

// Checked when the flow runs without a selection (the monthly full check)
const CURRENT_MEMBER_STATUSES = ["approved", "in-cancellation", "in-exclusion"];

const UPDATE_CHUNK_SIZE = 500;

// Body is the manual flow's $trigger.body; keys is empty when nothing was selected
const bodySchema = z.object({
  keys: z.array(z.union([z.string(), z.number()])).default([]),
});

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  const { keys } = await readValidatedBody(event, bodySchema.parse);

  const memberships = await readMembershipsToCheck(keys.map(Number));

  // One request returns every LotzApp address; paging parameters are ignored anyway
  const addresses = await $fetch<LotzappAddressCards[]>(
    lotzapp_url + "adressen/",
    { headers: { Authorization: lotzapp_auth } },
  );
  const index = buildLotzappCardIndex(addresses ?? []);

  const checkedAt = new Date().toISOString();
  const summary: Partial<Record<RfidCheckStatus, number>> = {};
  const updates = memberships.map((mship) => {
    const user = mship.memberships_user as { lotzapp_id?: string } | null;
    const result = checkMembershipCard(
      mship.memberships_card_id,
      user?.lotzapp_id,
      index,
    );
    summary[result.status] = (summary[result.status] ?? 0) + 1;
    return {
      id: mship.id,
      memberships_card_id_lotzapp: result.lotzappCards.join(", ") || null,
      memberships_card_check_status: result.status,
      memberships_card_checked_at: checkedAt,
    };
  });

  const directus = await useDirectusAdmin();
  for (let i = 0; i < updates.length; i += UPDATE_CHUNK_SIZE) {
    await directus.request(
      updateItemsBatch("memberships", updates.slice(i, i + UPDATE_CHUNK_SIZE)),
    );
  }

  console.log(
    `RFID check: ${updates.length} memberships checked`,
    JSON.stringify(summary),
  );
  return { checked: updates.length, summary };
});

async function readMembershipsToCheck(ids: number[]) {
  const directus = await useDirectusAdmin();
  return directus.request(
    readItems("memberships", {
      fields: [
        "id",
        "memberships_card_id",
        { memberships_user: ["lotzapp_id"] },
      ],
      filter:
        ids.length > 0
          ? { id: { _in: ids } }
          : { memberships_status: { _in: CURRENT_MEMBER_STATUSES } },
      limit: -1,
    }),
  );
}
