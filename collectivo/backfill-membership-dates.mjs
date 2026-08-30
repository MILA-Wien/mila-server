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
//
// Safe to re-run: activation_frozen_since is only filled where it is still empty.
// - activation_frozen_since: every currently-frozen membership (shifts_counter <= -28) gets a
//                freeze date. A membership sitting at exactly -28 crossed the threshold at
//                most one day ago (the -29 floor is only reached the following night), so it
//                gets today. A floored membership is estimated as last attended shift-log
//                date + 56 days, clamped to not exceed today. Frozen memberships without an
//                attended shift log fall back to today.
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
import { pathToFileURL } from "node:url";

const FREEZE_THRESHOLD = -28; // shifts_counter <= -28 => frozen (matches checkin.ts)
// Attending a shift adds +28 to the counter, which then decays 1/day until it reaches the
// -28 freeze threshold: 28 + 28 = 56 days from the last shift to the freeze.
const FREEZE_ESTIMATE_DAYS = 56;

const url = process.env.DIRECTUS_URL;
const token = process.env.DIRECTUS_ADMIN_TOKEN;
const dryRun = process.argv.includes("--dry-run");

// Created in main(); kept out of module scope so this file can be imported by tests
// without requiring credentials or performing any I/O.
let directus;

// Returns YYYY-MM-DD for a Date (Directus date fields store the date portion).
function toDateStr(date) {
  return date.toISOString().split("T")[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Freeze date for a single currently-frozen membership. Pure: no I/O, no clock reads.
// `today` and `lastAttendedShiftDate` are YYYY-MM-DD strings, which compare correctly
// lexicographically, so no Date arithmetic is needed for the clamp.
export function estimateFrozenSince({
  shiftsCounter,
  lastAttendedShiftDate,
  today,
}) {
  // Exactly at the threshold: the membership froze at most one day ago. Known, not guessed.
  if (shiftsCounter === FREEZE_THRESHOLD) return today;
  if (!lastAttendedShiftDate) return today;
  const estimate = toDateStr(addDays(lastAttendedShiftDate, FREEZE_ESTIMATE_DAYS));
  return estimate > today ? today : estimate;
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
  const todayStr = toDateStr(new Date());

  const frozenMemberships = await directus.request(
    readItems("memberships", {
      // Only memberships with no freeze date yet: this is a one-off, and the nightly
      // cronjob is the owner of the field from then on. Re-running must not clobber a
      // cron-maintained date, which would also restart that member's 28-day survey clock.
      filter: {
        shifts_counter: { _lte: FREEZE_THRESHOLD },
        activation_frozen_since: { _null: true },
      },
      fields: ["id", "shifts_counter"],
      limit: -1,
    }),
  );

  if (frozenMemberships.length === 0) {
    return { atThreshold: 0, estimated: 0, fallbackToday: 0 };
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

  let atThreshold = 0;
  let estimated = 0;
  let fallbackToday = 0;
  for (const membership of frozenMemberships) {
    const lastShift = latestShiftByMembership.get(membership.id) ?? null;
    const frozenSinceStr = estimateFrozenSince({
      shiftsCounter: membership.shifts_counter,
      lastAttendedShiftDate: lastShift,
      today: todayStr,
    });
    if (membership.shifts_counter === FREEZE_THRESHOLD) {
      atThreshold++;
    } else if (lastShift) {
      estimated++;
    } else {
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

  return { atThreshold, estimated, fallbackToday };
}

async function main() {
  if (!url || !token) {
    console.error("Set DIRECTUS_URL and DIRECTUS_ADMIN_TOKEN environment variables.");
    process.exit(1);
  }
  directus = createDirectus(url).with(staticToken(token)).with(rest());

  console.log(
    `Backfilling membership dates against ${url}${dryRun ? " (DRY RUN)" : ""}`,
  );

  console.log("\n== activation_last_shop ==");
  const lastShop = await backfillLastShop();

  console.log("\n== activation_frozen_since ==");
  const frozen = await backfillFrozenSince();

  console.log("\n== Summary ==");
  console.log(`  activation_last_shop updated: ${lastShop.updated}`);
  console.log(`  activation_frozen_since exact (at -28, froze <=1 day ago): ${frozen.atThreshold}`);
  console.log(`  activation_frozen_since estimated from shift logs: ${frozen.estimated}`);
  console.log(`  activation_frozen_since fallback to today (no shift log): ${frozen.fallbackToday}`);
  if (dryRun) {
    console.log("\nDry run — no changes were written. Re-run without --dry-run to apply.");
  }
}

// Only run when invoked directly, so tests can import the pure helpers above.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
}
