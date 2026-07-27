/**
 * PII-safe, aggregate-only export of shift-system statistics, meant to be
 * run against production to calibrate the constants in
 * server/api/create_example_data.post.ts so the synthetic seed data mirrors
 * the real statistical shape of the shift-assignment system.
 *
 * Every query here is either a Directus aggregate() call (count/countDistinct
 * grouped only by enum-like fields) or a bare fetch of a single
 * non-identifying column (a date, a boolean, or a count keyed by an
 * anonymous numeric id) that gets bucketed into a histogram in-memory - the
 * raw rows are never included in the printed output. Never fetched: member
 * names/emails/phone/address/payment details, coshopper names, or
 * shifts_logs.shifts_note (free text that may contain personal commentary).
 * The handful of collections exported in full (shifts_categories, and the
 * subset of shifts_shifts that's currently active/recurring/not-yet-ended)
 * have zero member references, but Directus auto-adds
 * user_created/user_updated (a directus_users FK, confirmed present on
 * shifts_shifts) and date_created/date_updated to collections with
 * change-tracking enabled - all four are always stripped before a row is
 * included in the report. The admin-written free-text fields
 * (shifts_shifts.shifts_description, shifts_categories.beschreibung) also
 * get a best-effort email/phone-number redaction pass - confirmed to catch
 * real phone numbers seen in practice, but still worth a quick manual read
 * of the output, this isn't a hard guarantee.
 *
 * Usage:
 *   EXPORT_DIRECTUS_URL=https://studio.mila.wien \
 *   EXPORT_DIRECTUS_TOKEN=<read-only-or-admin-token> \
 *   npx tsx scripts/export-shift-stats.ts [output-file]
 *
 * Writes the report directly to a file (default ./stats.json, relative to
 * wherever the script actually runs - collectivo/ when invoked via
 * `pnpm export-shift-stats`) rather than stdout, so it's never mixed up
 * with pnpm/npm's own "> package@version script" banner lines. Progress
 * goes to stderr. Override the path with a positional argument or
 * EXPORT_OUTPUT_FILE.
 *
 * Dry run against the local dev stack (docker compose --profile dev up):
 *   EXPORT_DIRECTUS_URL=http://localhost:8055 EXPORT_DIRECTUS_TOKEN=badToken123 \
 *   npx tsx scripts/export-shift-stats.ts
 *
 * Prefer a read-only, aggregate-scoped Directus token over the full admin
 * token if you can create one for this one-off job - none of these queries
 * need write access. schemaSnapshot() (used below to resolve the
 * shifts_categories junction table name and detect optional date_created
 * fields) does require an admin-scoped token; the script falls back to
 * probing collection/field existence directly if it's unavailable.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  aggregate,
  createDirectus,
  readItems,
  readSingleton,
  rest,
  schemaSnapshot,
  staticToken,
} from "@directus/sdk";
import type { DbSchema } from "../server/utils/dbSchema";

const url = process.env.EXPORT_DIRECTUS_URL;
const token = process.env.EXPORT_DIRECTUS_TOKEN;
const outputFile = resolve(process.argv[2] ?? process.env.EXPORT_OUTPUT_FILE ?? "stats.json");

if (!url || !token) {
  console.error(
    "Set EXPORT_DIRECTUS_URL and EXPORT_DIRECTUS_TOKEN (see the comment at the top of this file) before running.",
  );
  process.exit(1);
}

const directus = createDirectus<DbSchema>(url).with(staticToken(token)).with(rest());

// ============================================================================
// ERROR FORMATTING
// (the @directus/sdk throws an object with a huge nested Response - console
// logging it directly buries the actual reason, e.g. a wrong/expired token,
// under headers/streams noise. Pull out just the useful bit.)
// ============================================================================

function formatRequestError(err: unknown): string {
  const anyErr = err as any;
  const status = anyErr?.response?.status;
  const statusText = anyErr?.response?.statusText;
  const messages: string[] = Array.isArray(anyErr?.errors)
    ? anyErr.errors.map((e: any) => e?.message).filter(Boolean)
    : [];

  const parts: string[] = [];
  if (status) parts.push(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
  if (messages.length > 0) parts.push(messages.join("; "));
  if (parts.length > 0) {
    const hint = status === 401 || status === 403 ? " (check EXPORT_DIRECTUS_TOKEN)" : "";
    return parts.join(" - ") + hint;
  }

  if (err instanceof Error) {
    // Node's fetch wraps connection-level failures (wrong URL, server down,
    // DNS) in a generic "fetch failed" Error with the real reason in .cause.
    const cause = (err as any).cause;
    const causeMessage = cause?.code || cause?.message;
    const hint = causeMessage ? ` (${causeMessage}, check EXPORT_DIRECTUS_URL)` : "";
    return err.message + hint;
  }
  return String(err);
}

// ============================================================================
// GENERIC HELPERS
// ============================================================================

function num(v: unknown): number {
  return Number(v ?? 0);
}

/** Buckets a bare list of numbers into labeled ranges. The raw list is the
 * caller's to discard - this function only ever returns counts. */
function bucketNumeric(values: number[], edges: number[]): Record<string, number> {
  const labels = edges.map((edge, i) => (i === 0 ? `< ${edge}` : `${edges[i - 1]}-${edge}`));
  labels.push(`>= ${edges[edges.length - 1]}`);
  const counts = new Array(labels.length).fill(0);
  for (const v of values) {
    let bucket = edges.length;
    for (let i = 0; i < edges.length; i++) {
      if (v < edges[i]!) {
        bucket = i;
        break;
      }
    }
    counts[bucket]++;
  }
  const out: Record<string, number> = {};
  labels.forEach((label, i) => (out[label] = counts[i]));
  return out;
}

/** Exact-value histogram for small integer ranges (e.g. 0/1/2 slots filled),
 * clearer than bucketNumeric when the whole range is only a few values. */
function exactHistogram(values: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) {
    const key = String(v);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Like bucketNumeric, but pulls out one specific value into its own bucket
 * first (e.g. -29 is a known sentinel/reset value for shifts_counter) so it
 * doesn't get lost inside a wide range bucket like "< -10". */
function bucketNumericWithExactValue(
  values: number[],
  edges: number[],
  exactValue: number,
): Record<string, number> {
  const exactCount = values.filter((v) => v === exactValue).length;
  const rest = values.filter((v) => v !== exactValue);
  const histogram = bucketNumeric(rest, edges);
  return { [`== ${exactValue}`]: exactCount, ...histogram };
}

/** Directus auto-adds user_created/user_updated/date_created/date_updated to
 * collections that have "track changes" enabled - strip all four from any
 * "safe to export in full" collection. user_created/user_updated identify a
 * real person (typically an admin/staff member) even though the rest of the
 * row has no member data at all (confirmed present on shifts_shifts in
 * practice); date_created/date_updated aren't identifying but aren't useful
 * in a full-row export either. */
function stripAuditFields<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((row) => {
    const { user_created, user_updated, date_created, date_updated, ...rest } = row;
    return rest as T;
  });
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Broad "looks like a phone number" pattern (digits with optional +, spaces,
// dots, dashes, parens); the digit-count check below guards against
// false-positive matches on short unrelated numbers.
const PHONE_CANDIDATE_PATTERN = /(?:\+\d{1,3}[\s./-]?)?(?:\(?\d{2,5}\)?[\s./-]?){2,6}\d{2,4}/g;

/** Best-effort redaction of email addresses and phone numbers out of a
 * free-text field an admin typed (e.g. shifts_description). Not a guarantee -
 * still worth a quick manual read before treating the output as fully safe. */
function redactContactInfo(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  return text
    .replace(EMAIL_PATTERN, "[redacted email]")
    .replace(PHONE_CANDIDATE_PATTERN, (match) =>
      match.replace(/\D/g, "").length >= 7 ? "[redacted phone]" : match,
    );
}

function numericSummary(values: number[]) {
  if (values.length === 0) {
    return { count: 0, min: null, max: null, avg: null };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: Number((sum / values.length).toFixed(2)),
  };
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / (24 * 60 * 60 * 1000));
}

function daysFromNow(a: string): number {
  return Math.round((new Date(a).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// ============================================================================
// SCHEMA RESOLUTION
// (avoids hardcoding a junction-table name or assuming an optional field
// exists - dbSchema.ts is hand-maintained and may have drifted from prod)
// ============================================================================

let snapshotChecked = false;
let snapshot: any = null;

async function getSchemaSnapshot(): Promise<any> {
  if (snapshotChecked) return snapshot;
  snapshotChecked = true;
  try {
    snapshot = await directus.request(schemaSnapshot());
  } catch {
    console.error(
      "Note: schemaSnapshot() unavailable (needs an admin-scoped token) - falling back to collection/field probing.",
    );
    snapshot = null;
  }
  return snapshot;
}

/** Resolves the M2M junction collection between `memberships` and
 * `shifts_categories` (the shifts_categories_allowed alias field on
 * Membership doesn't tell us the junction collection's name). */
async function resolveCategoriesJunction(): Promise<string | null> {
  const snap = await getSchemaSnapshot();
  if (snap) {
    const relatedByCollection = new Map<string, Set<string>>();
    for (const relation of snap.relations as any[]) {
      const set = relatedByCollection.get(relation.collection) ?? new Set<string>();
      if (relation.related_collection) set.add(relation.related_collection);
      relatedByCollection.set(relation.collection, set);
    }
    for (const [collection, related] of relatedByCollection) {
      if (related.has("memberships") && related.has("shifts_categories")) {
        return collection;
      }
    }
    return null;
  }
  // Fallback: probe the conventional name (same pattern as the existing
  // memberships_shifts_skills junction).
  for (const guess of ["memberships_shifts_categories", "shifts_categories_memberships"]) {
    try {
      await directus.request(
        readItems(guess as any, {
          fields: ["memberships_id", "shifts_categories_id"],
          limit: 1,
        }),
      );
      return guess;
    } catch {
      // try next guess
    }
  }
  console.error(
    `Warning: could not resolve the memberships<->shifts_categories junction collection. shifts_categories_allowed adoption rates will be omitted.`,
  );
  return null;
}

async function hasField(collection: string, field: string): Promise<boolean> {
  const snap = await getSchemaSnapshot();
  if (snap) {
    return (snap.fields as any[]).some((f) => f.collection === collection && f.field === field);
  }
  try {
    await directus.request(readItems(collection as any, { fields: [field], limit: 1 } as any));
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// MEMBERSHIPS
// ============================================================================

async function getMembershipStats() {
  const totalAgg = await directus.request(
    aggregate("memberships", { aggregate: { count: "*" } } as any),
  );
  const totalCount = num((totalAgg as any[])[0]?.count);

  const crossTab = await directus.request(
    aggregate("memberships", {
      aggregate: { count: "*" },
      groupBy: ["memberships_type", "memberships_status"],
    } as any),
  );

  const userTypeMix = await directus.request(
    aggregate("memberships", {
      aggregate: { count: "*" },
      groupBy: ["shifts_user_type"],
    } as any),
  );

  // "Active" = memberships_type Aktiv (shopping member, not Investierend)
  // AND memberships_status approved - matches the filter dbGetMembershipsForDecrement
  // uses for the weekly counter cronjob.
  const activeCounters = await directus.request(
    readItems("memberships", {
      fields: ["shifts_counter"],
      filter: {
        memberships_type: { _eq: "Aktiv" },
        memberships_status: { _eq: "approved" },
      } as any,
      limit: -1,
    }),
  );
  const counterValues = (activeCounters as any[]).map((m) => num(m.shifts_counter));

  return {
    total_count: totalCount,
    status_type_crosstab: (crossTab as any[]).map((r) => ({
      memberships_type: r.memberships_type,
      memberships_status: r.memberships_status,
      count: num(r.count),
    })),
    shifts_user_type_mix: (userTypeMix as any[]).map((r) => ({
      shifts_user_type: r.shifts_user_type,
      count: num(r.count),
    })),
    // aka "shift points" in the app's own terminology (settings_hidden.shift_point_system)
    active_shifts_counter: {
      ...numericSummary(counterValues),
      // -29 is called out explicitly: seen in practice as a distinct
      // recurring value, easy to lose inside the "< -10" catch-all bucket.
      histogram: bucketNumericWithExactValue(counterValues, [-10, 0, 10, 20, 30, 50], -29),
    },
  };
}

// ============================================================================
// COSHOPPERS
// ============================================================================

// Every coshopper belongs to exactly one membership (no membership has more
// than one), so a per-membership histogram would always just be "N have 1,
// everyone else has 0" - not worth computing.
async function getCoshopperStats() {
  const totalAgg = await directus.request(
    aggregate("memberships_coshoppers", { aggregate: { count: "*" } } as any),
  );
  return { total: num((totalAgg as any[])[0]?.count) };
}

// ============================================================================
// SKILLS
// ============================================================================

async function getSkillStats() {
  const skills = await directus.request(
    readItems("shifts_skills", { fields: ["id", "name_de", "name_en", "icon"], limit: -1 }),
  );
  const counts = await directus.request(
    aggregate("memberships_shifts_skills", {
      aggregate: { count: "*" },
      groupBy: ["shifts_skills_id"],
    } as any),
  );
  const countById = new Map<number, number>();
  for (const row of counts as any[]) countById.set(row.shifts_skills_id, num(row.count));

  return (skills as any[]).map((s) => ({
    id: s.id,
    name_en: s.name_en,
    name_de: s.name_de,
    icon: s.icon,
    member_count: countById.get(s.id) ?? 0,
  }));
}

// ============================================================================
// SHIFT CATEGORIES
// ============================================================================

async function getCategoryStats(junctionCollection: string | null, activeMemberships: number) {
  const categories = await directus.request(
    readItems("shifts_categories", { fields: ["*"], limit: -1 }),
  );
  // beschreibung is the same kind of admin-written free text as
  // shifts_description on shifts_shifts - confirmed to contain real phone
  // numbers in practice, so it gets the same redaction pass.
  const sanitizedCategories = (categories as any[]).map((c) => ({
    ...c,
    beschreibung: redactContactInfo(c.beschreibung),
  }));

  let adoptionPercentByCategory: {
    category_id: number;
    member_count: number;
    row_count: number;
    percent: number;
  }[] = [];
  if (junctionCollection) {
    // countDistinct on the membership side, not a flat row count: junction
    // tables like this can and do contain more than one row per membership
    // for the same category (seen in practice - a flat count produced
    // percentages over 100%). row_count is kept alongside so a mismatch
    // between the two remains visible instead of silently disappearing.
    const counts = await directus.request(
      aggregate(junctionCollection as any, {
        aggregate: { count: "*", countDistinct: "memberships_id" },
        groupBy: ["shifts_categories_id"],
      } as any),
    );
    adoptionPercentByCategory = (counts as any[]).map((r) => {
      const memberCount = num(r.countDistinct?.memberships_id);
      return {
        category_id: r.shifts_categories_id,
        member_count: memberCount,
        row_count: num(r.count),
        percent:
          activeMemberships > 0 ? Number(((memberCount / activeMemberships) * 100).toFixed(1)) : 0,
      };
    });
  }

  return {
    categories: stripAuditFields(sanitizedCategories),
    junction_collection_used: junctionCollection,
    adoption_percent_by_category: adoptionPercentByCategory,
  };
}

// ============================================================================
// SHIFTS
// Full rows only for shifts that are still "live" (active/published,
// recurring, and not already ended) - that's the shape the seed script
// actually needs to imitate. Everything else (ended fixed-term shifts,
// one-time definitions, non-published shifts) only contributes to the
// aggregate counts/mixes below, never as raw rows.
// ============================================================================

async function getShiftStats() {
  const activeOngoingFilter = {
    shifts_status: { _eq: "published" },
    shifts_is_regular: { _eq: true },
    _or: [{ shifts_to: { _null: true } }, { shifts_to: { _gte: "$NOW" } }],
  };

  const activeOngoingRows = await directus.request(
    readItems("shifts_shifts", {
      filter: activeOngoingFilter as any,
      fields: ["*"],
      limit: -1,
    }),
  );
  const sanitizedRows = stripAuditFields(activeOngoingRows as any[]).map((row) => ({
    ...row,
    shifts_description: redactContactInfo(row.shifts_description),
  }));

  const totalAgg = await directus.request(
    aggregate("shifts_shifts", { aggregate: { count: "*" } } as any),
  );
  const totalShifts = num((totalAgg as any[])[0]?.count);

  const regularEndedAgg = await directus.request(
    aggregate("shifts_shifts", {
      aggregate: { count: "*" },
      query: {
        filter: { shifts_is_regular: { _eq: true }, shifts_to: { _nnull: true, _lt: "$NOW" } },
      },
    } as any),
  );
  const oneTimeDefinitionsAgg = await directus.request(
    aggregate("shifts_shifts", {
      aggregate: { count: "*" },
      query: { filter: { shifts_is_regular: { _eq: false } } },
    } as any),
  );

  const statusMix = await directus.request(
    aggregate("shifts_shifts", {
      aggregate: { count: "*" },
      groupBy: ["shifts_status"],
    } as any),
  );
  const categoryMix = await directus.request(
    aggregate("shifts_shifts", {
      aggregate: { count: "*" },
      groupBy: ["shifts_category_2"],
    } as any),
  );

  return {
    active_recurring_ongoing: sanitizedRows,
    other_shifts_summary: {
      description:
        "Shifts not matching active_recurring_ongoing (published + regular + no end date or end date in the future) - counts only, no raw rows.",
      total_shifts: totalShifts,
      active_recurring_ongoing_count: sanitizedRows.length,
      regular_with_past_end_date: num((regularEndedAgg as any[])[0]?.count),
      one_time_definitions: num((oneTimeDefinitionsAgg as any[])[0]?.count),
    },
    status_mix: (statusMix as any[]).map((r) => ({
      shifts_status: r.shifts_status,
      count: num(r.count),
    })),
    category_mix: (categoryMix as any[]).map((r) => ({
      shifts_category_2: r.shifts_category_2,
      count: num(r.count),
    })),
  };
}

// ============================================================================
// SHIFT ASSIGNMENTS
// ============================================================================

async function getAssignmentStats(hasAssignmentDateCreated: boolean) {
  const regularVsOneTime = await directus.request(
    aggregate("shifts_assignments", {
      aggregate: { count: "*" },
      groupBy: ["shifts_is_regular"],
    } as any),
  );

  const terminatedRegular = await directus.request(
    aggregate("shifts_assignments", {
      aggregate: { count: "*" },
      query: {
        filter: {
          shifts_is_regular: { _eq: true },
          shifts_to: { _nnull: true, _lt: "$NOW" },
        },
      },
    } as any),
  );

  const horizonFields = hasAssignmentDateCreated ? ["shifts_from", "date_created"] : ["shifts_from"];
  const futureOneTime = await directus.request(
    readItems("shifts_assignments", {
      fields: horizonFields as any,
      filter: {
        shifts_is_regular: { _eq: false },
        shifts_from: { _gte: "$NOW" },
      } as any,
      limit: -1,
    }),
  );
  const leadDays = (futureOneTime as any[]).map((a) =>
    hasAssignmentDateCreated ? daysBetween(a.shifts_from, a.date_created) : daysFromNow(a.shifts_from),
  );

  const occupancy = await directus.request(
    aggregate("shifts_assignments", {
      aggregate: { countDistinct: "shifts_membership" },
      groupBy: ["shifts_shift"],
      query: { filter: { shifts_is_regular: { _eq: true } } },
    } as any),
  );
  const occCounts = (occupancy as any[]).map((r) => num(r.countDistinct?.shifts_membership));

  return {
    regular_vs_onetime: (regularVsOneTime as any[]).map((r) => ({
      shifts_is_regular: r.shifts_is_regular,
      count: num(r.count),
    })),
    regular_terminated_count: num((terminatedRegular as any[])[0]?.count),
    future_onetime_lead_time_days: {
      method: hasAssignmentDateCreated
        ? "real (date_created -> shifts_from)"
        : "snapshot proxy (now -> shifts_from)",
      ...numericSummary(leadDays),
      histogram: bucketNumeric(leadDays, [0, 7, 14, 30, 60, 90]),
    },
    regular_occupancy_per_shift_histogram: exactHistogram(occCounts),
  };
}

// ============================================================================
// SHIFT LOGS (attendance history)
// ============================================================================

async function getShiftLogStats() {
  const typeMix = await directus.request(
    aggregate("shifts_logs", {
      aggregate: { count: "*" },
      groupBy: ["shifts_type"],
    } as any),
  );
  // shifts_note is deliberately never fetched - free text, likely to contain
  // personal commentary about a member.
  const scores = await directus.request(
    readItems("shifts_logs", { fields: ["shifts_score"], limit: -1 } as any),
  );
  const scoreValues = (scores as any[]).map((s) => num(s.shifts_score));

  return {
    type_mix: (typeMix as any[]).map((r) => ({ shifts_type: r.shifts_type, count: num(r.count) })),
    score: numericSummary(scoreValues),
  };
}

// ============================================================================
// BUDDY STATUS
// ============================================================================

async function getBuddyStatusStats() {
  const mix = await directus.request(
    aggregate("directus_users", {
      aggregate: { count: "*" },
      groupBy: ["buddy_status"],
      query: { filter: { role: { name: { _eq: "NutzerInnen" } } } },
    } as any),
  );
  return (mix as any[]).map((r) => ({ buddy_status: r.buddy_status, count: num(r.count) }));
}

// ============================================================================
// SHIFT ABSENCES (holidays + single-occurrence cancellations)
// ============================================================================

async function getAbsenceStats(activeMemberships: number, hasAbsenceDateCreated: boolean) {
  void hasAbsenceDateCreated; // reserved: could add real request->holiday lead time later

  const holidayCountAgg = await directus.request(
    aggregate("shifts_absences", {
      aggregate: { count: "*" },
      query: { filter: { shifts_is_holiday: { _eq: true } } },
    } as any),
  );

  const holidayRows = await directus.request(
    readItems("shifts_absences", {
      fields: ["shifts_from", "shifts_to"],
      filter: { shifts_is_holiday: { _eq: true } } as any,
      limit: -1,
    }),
  );
  const durations = (holidayRows as any[]).map((r) => daysBetween(r.shifts_to, r.shifts_from) + 1);
  const leadTimes = (holidayRows as any[]).map((r) => daysFromNow(r.shifts_from));

  const nonHolidayCountAgg = await directus.request(
    aggregate("shifts_absences", {
      aggregate: { count: "*" },
      query: { filter: { shifts_is_holiday: { _neq: true } } },
    } as any),
  );
  const nonHolidayRows = await directus.request(
    readItems("shifts_absences", {
      fields: ["id", "shifts_assignment.shifts_is_regular"] as any,
      filter: { shifts_is_holiday: { _neq: true } } as any,
      limit: -1,
    }),
  );
  let cancelledRegularOccurrence = 0;
  let cancelledOneTime = 0;
  for (const row of nonHolidayRows as any[]) {
    if (row.shifts_assignment?.shifts_is_regular) cancelledRegularOccurrence++;
    else cancelledOneTime++;
  }

  const onHolidayTodayAgg = await directus.request(
    aggregate("shifts_absences", {
      aggregate: { countDistinct: "shifts_membership" },
      query: {
        filter: {
          shifts_is_holiday: { _eq: true },
          shifts_from: { _lte: "$NOW" },
          shifts_to: { _gte: "$NOW" },
        },
      },
    } as any),
  );
  const onHolidayTodayCount = num((onHolidayTodayAgg as any[])[0]?.countDistinct?.shifts_membership);

  return {
    holiday_count: num((holidayCountAgg as any[])[0]?.count),
    holiday_duration_days: {
      ...numericSummary(durations),
      histogram: bucketNumeric(durations, [7, 14, 21, 30, 60]),
    },
    holiday_lead_time_days: {
      ...numericSummary(leadTimes),
      histogram: bucketNumeric(leadTimes, [0, 7, 14, 30, 60, 90]),
    },
    single_occurrence_cancellations: {
      total: num((nonHolidayCountAgg as any[])[0]?.count),
      regular_occurrence_unsubscribes: cancelledRegularOccurrence,
      onetime_cancellations: cancelledOneTime,
    },
    percent_active_members_on_holiday_today:
      activeMemberships > 0 ? Number(((onHolidayTodayCount / activeMemberships) * 100).toFixed(1)) : 0,
  };
}

// ============================================================================
// SETTINGS
// ============================================================================

async function getSettingsStats() {
  const settings = await directus.request(readSingleton("settings_hidden"));
  return {
    shift_holiday_min_days: settings.shift_holiday_min_days,
    shift_point_system: settings.shift_point_system,
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.error("Resolving schema (categories junction, date_created fields)...");
  const junctionCollection = await resolveCategoriesJunction();
  const assignmentsHaveDateCreated = await hasField("shifts_assignments", "date_created");
  const absencesHaveDateCreated = await hasField("shifts_absences", "date_created");

  console.error("Querying memberships...");
  const membershipStats = await getMembershipStats();
  const activeMemberships = membershipStats.active_shifts_counter.count;

  console.error("Querying coshoppers...");
  const coshopperStats = await getCoshopperStats();

  console.error("Querying skills...");
  const skillStats = await getSkillStats();

  console.error("Querying shift categories...");
  const categoryStats = await getCategoryStats(junctionCollection, activeMemberships);

  console.error("Querying shifts...");
  const shiftStats = await getShiftStats();

  console.error("Querying shift assignments...");
  const assignmentStats = await getAssignmentStats(assignmentsHaveDateCreated);

  console.error("Querying shift logs...");
  const shiftLogStats = await getShiftLogStats();

  console.error("Querying buddy_status...");
  const buddyStatusStats = await getBuddyStatusStats();

  console.error("Querying shift absences...");
  const absenceStats = await getAbsenceStats(activeMemberships, absencesHaveDateCreated);

  console.error("Querying settings...");
  const settingsStats = await getSettingsStats();

  const report = {
    generated_at: new Date().toISOString(),
    source: url,
    notes: [
      "All numbers here are counts, aggregates, or histograms bucketed from non-identifying columns.",
      "No member names, emails, phone numbers, addresses, payment details, or free-text notes were ever fetched.",
      `active membership definition: memberships_type=Aktiv AND memberships_status=approved (n=${activeMemberships} of ${membershipStats.total_count} total)`,
    ],
    memberships: membershipStats,
    coshoppers: coshopperStats,
    skills: skillStats,
    shifts_categories: categoryStats,
    shifts: shiftStats,
    shifts_assignments: assignmentStats,
    shifts_logs: shiftLogStats,
    buddy_status: buddyStatusStats,
    shifts_absences: absenceStats,
    settings: settingsStats,
  };

  writeFileSync(outputFile, JSON.stringify(report, null, 2) + "\n");
  console.error(`Wrote report to ${outputFile}`);
}

main().catch((err) => {
  console.error("Export failed:", formatRequestError(err));
  process.exit(1);
});
