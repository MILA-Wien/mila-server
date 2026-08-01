// One-off backfill for the memberships.activation_last_shop and memberships.activation_frozen_since fields.
//
// Lives in collectivo/ so it resolves @directus/sdk from collectivo/node_modules.
// Run locally from the collectivo/ directory against a Directus instance with an
// admin token:
//
//   cd collectivo
//   DIRECTUS_URL=http://localhost:8055 \
//   DIRECTUS_ADMIN_TOKEN=xxxx \
//   node backfill-membership-dates.mjs [--dry-run]
//
// - activation_last_shop:   every membership gets the date of its most recent milaccess_log entry.
//                Memberships without any checkin log are left untouched.
// - activation_frozen_since: every currently-frozen membership (shifts_counter <= -28) gets an
//                estimated freeze date = last attended shift-log date + 28 days, clamped
//                to not exceed today. Frozen members without an attended shift log fall
//                back to today.
//
// This is a one-off: ongoing maintenance is handled by the checkin flow (activation_last_shop) and
// the daily cronjob (activation_frozen_since).

import {
  createDirectus,
  rest,
  staticToken,
  readItems,
  updateItem,
} from "@directus/sdk";

const FREEZE_THRESHOLD = -28; // shifts_counter <= -28 => frozen (matches checkin.ts)
const FREEZE_ESTIMATE_DAYS = 28; // counter starts at the default buffer of 28, drops 1/day

const url = process.env.DIRECTUS_URL;
const token = process.env.DIRECTUS_ADMIN_TOKEN;
const dryRun = process.argv.includes("--dry-run");

if (!url || !token) {
  console.error("Set DIRECTUS_URL and DIRECTUS_ADMIN_TOKEN environment variables.");
  process.exit(1);
}

const directus = createDirectus(url).with(staticToken(token)).with(rest());

// Returns YYYY-MM-DD for a Date (Directus date fields store the date portion).
function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function backfillLastShop() {
  // Newest first, so the first row seen per membership is its latest checkin.
  const logs = await directus.request(
    readItems("milaccess_log", {
      fields: ["membership", "date"],
      sort: ["-date"],
      limit: -1,
    }),
  );

  const latestByMembership = new Map();
  for (const log of logs) {
    if (log.membership == null) continue;
    if (!latestByMembership.has(log.membership)) {
      latestByMembership.set(log.membership, log.date);
    }
  }

  let updated = 0;
  for (const [membershipId, date] of latestByMembership) {
    const dateStr = toDateStr(new Date(date));
    console.log(`  activation_last_shop: membership ${membershipId} -> ${dateStr}`);
    if (!dryRun) {
      await directus.request(
        updateItem("memberships", membershipId, { activation_last_shop: dateStr }),
      );
    }
    updated++;
  }
  return { updated, withoutLog: "n/a (only members with logs are touched)" };
}

async function backfillFrozenSince() {
  const today = new Date();
  const todayStr = toDateStr(today);

  const frozenMemberships = await directus.request(
    readItems("memberships", {
      filter: { shifts_counter: { _lte: FREEZE_THRESHOLD } },
      fields: ["id", "shifts_counter"],
      limit: -1,
    }),
  );

  if (frozenMemberships.length === 0) {
    return { estimated: 0, fallbackToday: 0 };
  }

  const frozenIds = frozenMemberships.map((m) => m.id);

  // Latest attended shift-log date per frozen membership.
  const shiftLogs = await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_type: { _eq: "attended" },
        shifts_membership: { _in: frozenIds },
      },
      fields: ["shifts_membership", "shifts_date"],
      sort: ["-shifts_date"],
      limit: -1,
    }),
  );

  const latestShiftByMembership = new Map();
  for (const log of shiftLogs) {
    const mship = log.shifts_membership;
    if (mship == null) continue;
    if (!latestShiftByMembership.has(mship)) {
      latestShiftByMembership.set(mship, log.shifts_date);
    }
  }

  let estimated = 0;
  let fallbackToday = 0;
  for (const membership of frozenMemberships) {
    const lastShift = latestShiftByMembership.get(membership.id);
    let frozenSinceStr;
    if (lastShift) {
      const estimate = addDays(lastShift, FREEZE_ESTIMATE_DAYS);
      // Clamp so the estimate is never in the future.
      frozenSinceStr = estimate > today ? todayStr : toDateStr(estimate);
      estimated++;
    } else {
      frozenSinceStr = todayStr;
      fallbackToday++;
      console.log(
        `  activation_frozen_since: membership ${membership.id} has no attended shift log -> fallback to today (${todayStr})`,
      );
    }
    console.log(`  activation_frozen_since: membership ${membership.id} -> ${frozenSinceStr}`);
    if (!dryRun) {
      await directus.request(
        updateItem("memberships", membership.id, { activation_frozen_since: frozenSinceStr }),
      );
    }
  }

  return { estimated, fallbackToday };
}

async function main() {
  console.log(
    `Backfilling membership dates against ${url}${dryRun ? " (DRY RUN)" : ""}`,
  );

  console.log("\n== activation_last_shop ==");
  const lastShop = await backfillLastShop();

  console.log("\n== activation_frozen_since ==");
  const frozen = await backfillFrozenSince();

  console.log("\n== Summary ==");
  console.log(`  activation_last_shop updated: ${lastShop.updated}`);
  console.log(`  activation_frozen_since estimated from shift logs: ${frozen.estimated}`);
  console.log(`  activation_frozen_since fallback to today (no shift log): ${frozen.fallbackToday}`);
  if (dryRun) {
    console.log("\nDry run — no changes were written. Re-run without --dry-run to apply.");
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
