/**
 * One-off backfill: overwrite firstName/lastName in Keycloak for every
 * Directus user (provider = "keycloak") from that user's current
 * username/username_last fields.
 *
 * The regular sync (server/api/user_sync_keycloak.post.ts) only fires on
 * Directus items.update events where the payload actually contains
 * username/username_last - it never touches existing users unless they're
 * edited again. This script does a one-time bulk push for everyone already
 * in Directus, matching the same username -> firstName / username_last ->
 * lastName mapping.
 *
 * Usage:
 *   BACKFILL_DIRECTUS_URL=https://studio.mila.wien \
 *   BACKFILL_DIRECTUS_TOKEN=<admin-token> \
 *   BACKFILL_KEYCLOAK_URL=https://login.mila.wien \
 *   BACKFILL_KEYCLOAK_REALM=collectivo \
 *   BACKFILL_KEYCLOAK_ADMIN_CLIENT=admin-cli \
 *   BACKFILL_KEYCLOAK_ADMIN_SECRET=<secret> \
 *   npx tsx scripts/backfill-keycloak-names.ts [--dry-run]
 *
 * Dry run against the local dev stack:
 *   BACKFILL_DIRECTUS_URL=http://localhost:8055 BACKFILL_DIRECTUS_TOKEN=my_directus_token \
 *   BACKFILL_KEYCLOAK_URL=http://keycloak:8080 BACKFILL_KEYCLOAK_REALM=collectivo \
 *   BACKFILL_KEYCLOAK_ADMIN_CLIENT=admin-cli BACKFILL_KEYCLOAK_ADMIN_SECRET=********** \
 *   npx tsx scripts/backfill-keycloak-names.ts --dry-run
 *
 * --dry-run prints what would be changed without calling the Keycloak admin API.
 */

import { createDirectus, readUsers, rest, staticToken } from "@directus/sdk";
import KcAdminClient from "@keycloak/keycloak-admin-client";
import type { DbSchema } from "../server/utils/dbSchema";

const directusUrl = process.env.BACKFILL_DIRECTUS_URL;
const directusToken = process.env.BACKFILL_DIRECTUS_TOKEN;
const keycloakUrl = process.env.BACKFILL_KEYCLOAK_URL;
const keycloakRealm = process.env.BACKFILL_KEYCLOAK_REALM;
const keycloakAdminClient = process.env.BACKFILL_KEYCLOAK_ADMIN_CLIENT;
const keycloakAdminSecret = process.env.BACKFILL_KEYCLOAK_ADMIN_SECRET;
const dryRun = process.argv.includes("--dry-run");

if (
  !directusUrl ||
  !directusToken ||
  !keycloakUrl ||
  !keycloakRealm ||
  !keycloakAdminClient ||
  !keycloakAdminSecret
) {
  console.error(
    "Set BACKFILL_DIRECTUS_URL, BACKFILL_DIRECTUS_TOKEN, BACKFILL_KEYCLOAK_URL, BACKFILL_KEYCLOAK_REALM, " +
      "BACKFILL_KEYCLOAK_ADMIN_CLIENT and BACKFILL_KEYCLOAK_ADMIN_SECRET (see the comment at the top of this file) before running.",
  );
  process.exit(1);
}

const directus = createDirectus<DbSchema>(directusUrl)
  .with(staticToken(directusToken))
  .with(rest());

async function main() {
  const keycloak = new KcAdminClient({
    baseUrl: keycloakUrl!,
    realmName: keycloakRealm!,
  });
  await keycloak.auth({
    grantType: "client_credentials",
    clientId: keycloakAdminClient!,
    clientSecret: keycloakAdminSecret!,
  });

  console.error("Fetching Directus users with provider=keycloak...");
  const users = await directus.request(
    readUsers({
      filter: { provider: { _eq: "keycloak" } } as any,
      fields: ["id", "email", "username", "username_last"],
      limit: -1,
    }),
  );

  console.error(
    `Found ${users.length} users. ${dryRun ? "(dry run - no writes)" : ""}`,
  );

  let updated = 0;
  let skippedNoEmail = 0;
  let skippedNoKcUser = 0;

  for (const user of users as any[]) {
    if (!user.email) {
      skippedNoEmail++;
      continue;
    }

    const kcUsers = await keycloak.users.find({
      first: 0,
      max: 1,
      email: user.email,
    });
    const kcUserId = kcUsers?.[0]?.id;
    if (!kcUserId) {
      console.error(`No Keycloak user found for ${user.email}, skipping`);
      skippedNoKcUser++;
      continue;
    }

    console.error(
      `${dryRun ? "[dry-run] " : ""}${user.email}: firstName=${JSON.stringify(user.username)}, lastName=${JSON.stringify(user.username_last)}`,
    );

    if (!dryRun) {
      await keycloak.users.update(
        { id: kcUserId },
        { firstName: user.username ?? "", lastName: user.username_last ?? "" },
      );
    }
    updated++;
  }

  console.error(
    `Done. updated=${updated} skipped_no_email=${skippedNoEmail} skipped_no_keycloak_user=${skippedNoKcUser}`,
  );
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
