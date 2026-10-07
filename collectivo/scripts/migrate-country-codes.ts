/**
 * One-off migration: convert `memberships_country` on directus_users from the free-text
 * values entered before the country dropdown to ISO 3166-1 alpha-2 codes.
 *
 * Values not in COUNTRY_CODES below are left unchanged and printed, for manual fixing.
 *
 * Usage:
 *   BACKFILL_DIRECTUS_URL=https://studio.mila.wien \
 *   BACKFILL_DIRECTUS_TOKEN=<admin-token> \
 *   npx tsx scripts/migrate-country-codes.ts --dry-run
 *
 *   cd collectivo
 *   BACKFILL_DIRECTUS_URL=http://localhost:8055 \
 *   BACKFILL_DIRECTUS_TOKEN=badToken123 \
 *   npx tsx scripts/migrate-country-codes.ts --dry-run
 *
 *   --dry-run prints what would be changed without writing to Directus.
 */

import {
  createDirectus,
  readUsers,
  rest,
  staticToken,
  updateUser,
} from "@directus/sdk";
import type { DbSchema } from "../server/utils/dbSchema";

// The distinct values found in the database before the migration.
const COUNTRY_CODES: Record<string, string> = {
  "Österreich": "AT",
  "Österreich ": "AT",
  "österreich": "AT",
  "österreich ": "AT",
  "Osterreich": "AT",
  "osterreich": "AT",
  "ÖSTERREICH": "AT",
  "ÖSTERREICH ": "AT",
  "ÖSterreich": "AT",
  "Ōsterreich": "AT",
  "Oesterreich": "AT",
  "Ö": "AT",
  "Austria": "AT",
  "Austria ": "AT",
  "austria": "AT",
  "AT ": "AT",
  "At": "AT",
  "AUT": "AT",
  "Autriche": "AT",
  "Rakúsko": "AT",
  "Ausztria": "AT",
  "Wien": "AT",
  "Deutschland": "DE",
  "Schweiz": "CH",
  "Switzerland": "CH",
  "United Kingdom": "GB",
  "Italien": "IT",
};

const directusUrl = process.env.BACKFILL_DIRECTUS_URL;
const directusToken = process.env.BACKFILL_DIRECTUS_TOKEN;
const dryRun = process.argv.includes("--dry-run");

const directus = createDirectus<DbSchema>(directusUrl)
  .with(staticToken(directusToken))
  .with(rest());

async function main() {
  const users = await directus.request(
    readUsers({
      filter: { memberships_country: { _nnull: true } } as any,
      fields: ["id", "email", "memberships_country"],
      limit: -1,
    }),
  );

  let updated = 0;
  let unknown = 0;

  for (const user of users as any[]) {
    const code = COUNTRY_CODES[user.memberships_country];

    if (!code) {
      // Already a code (e.g. "AT", "DE") or a value not in the list above
      if (!/^[A-Z]{2}$/.test(user.memberships_country)) {
        console.error(
          `Unknown value for ${user.email}: ${JSON.stringify(user.memberships_country)}, skipping`,
        );
        unknown++;
      }
      continue;
    }

    console.error(
      `${dryRun ? "[dry-run] " : ""}${user.email}: ${JSON.stringify(user.memberships_country)} -> ${code}`,
    );
    if (!dryRun) {
      await directus.request(updateUser(user.id, { memberships_country: code }));
    }
    updated++;
  }

  console.error(`Done. updated=${updated} unknown=${unknown}`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
