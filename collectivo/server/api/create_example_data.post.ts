import {
  aggregate,
  createItem,
  createItems,
  createUser,
  createUsers,
  deleteItems,
  deleteUsers,
  readRoles,
  readUsers,
  readItems,
  updateItems,
  updateSingleton,
  updateUser,
} from "@directus/sdk";

import { DateTime } from "luxon";

// Small, e2e-fast membership count (as opposed the full production-calibrated
// TARGET_TOTAL_MEMBERSHIPS used for manual/dev seeding).
const SEED_SCALE_SMALL_TOTAL_MEMBERSHIPS = 60;

// Resolved lazily (called only once the handler actually runs, by which
// point the whole module - including TARGET_TOTAL_MEMBERSHIPS further down -
// has finished loading), so it's safe for this to be declared above that
// constant.
function resolveSeedTotalMemberships(event: any): number {
  const query = getQuery(event);
  // ?scale repeated in the querystring parses as string[], which would
  // never === "large" and silently fall through to "small" below - take the
  // last occurrence instead.
  const scaleParam = query.scale;
  const rawScale = Array.isArray(scaleParam) ? scaleParam[scaleParam.length - 1] : scaleParam;
  const raw = (rawScale as string | undefined) ?? process.env.COLLECTIVO_SEED_SCALE;
  return raw === "large" ? TARGET_TOTAL_MEMBERSHIPS : SEED_SCALE_SMALL_TOTAL_MEMBERSHIPS;
}

export default defineEventHandler(async (event) => {
  await create_examples(resolveSeedTotalMemberships(event));
});

// ============================================================================
// DETERMINISTIC RNG
// ============================================================================

// mulberry32 - small seeded PRNG so re-running this seed endpoint always
// produces the same "random" assignments/skills/holidays (diffable fixture
// data), instead of a new random dataset on every run.
function makeRng(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Reset at the start of every seed run (see create_examples) so re-running
// this endpoint always replays the same sequence of "random" choices,
// instead of continuing the PRNG state from a previous run.
let rng = makeRng(42);

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffled(arr).slice(0, Math.max(0, n));
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Weighted random pick without consuming a variable number of rng() calls -
 * always exactly one, so the overall rng sequence stays predictable. */
function pickWeighted<T>(items: { weight: number; value: T }[]): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    if (r < item.weight) return item.value;
    r -= item.weight;
  }
  return items[items.length - 1]!.value;
}

/** Bernoulli draw: true with probability p. */
function chance(p: number): boolean {
  return rng() < p;
}

/** Splits an array into fixed-size chunks and awaits fn(chunk) for each in
 * sequence, flattening the results - keeps individual Directus requests to a
 * sane size when creating thousands of rows. */
async function inChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (chunk: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    results.push(...(await fn(chunk)));
  }
  return results;
}

const BULK_CHUNK_SIZE = 500;
// GET-request _in filters hit request-header/URL size limits well before
// BULK_CHUNK_SIZE (confirmed: 500 emails in one filter -> HTTP 431) since
// they're serialized into the URL, unlike bulk-create's POST body.
const EMAIL_LOOKUP_CHUNK_SIZE = 150;
// directus_users carries two active flows on items.create - User Sync
// Keycloak (a *blocking* filter) and User Create Access (an action) - both
// of which call back into this same single-threaded Nuxt process while it's
// mid-seed. createUsers(chunk) makes Directus fire one such callback burst
// per chunk; at BULK_CHUNK_SIZE (500) that self-inflicted load can time out
// a blocking filter callback and fail the whole chunk.
// Kept well under BULK_CHUNK_SIZE for this one call site.
const USER_CREATE_CHUNK_SIZE = 50;

/** Deletes every row in `collection`, looping deleteItems({limit}) calls
 * (which only ever remove up to `limit` rows per call) and re-checking the
 * count until it's confirmed empty. */
async function purgeAll(collection: string, chunkLimit = 5000): Promise<void> {
  const directus = await useDirectusAdmin();
  let previousCount = Infinity;
  while (true) {
    const agg = await directus.request(
      aggregate(collection as any, { aggregate: { count: "*" } } as any),
    );
    const count = Number((agg as any[])[0]?.count ?? 0);
    if (count === 0) return;
    // Guards against spinning forever if a delete call ever succeeds
    // without actually shrinking the collection - e.g. permission scoping
    // limiting which rows deleteItems can see/remove.
    if (count >= previousCount) {
      throw new Error(
        `purgeAll("${collection}"): row count did not decrease (${previousCount} -> ${count}) - aborting instead of looping forever. Check permissions/scoping on this collection.`,
      );
    }
    previousCount = count;
    await directus.request(deleteItems(collection as any, { limit: chunkLimit }));
  }
}

// shifts_shifts/shifts_assignments/shifts_absences.shifts_from/shifts_to are
// all Directus "date" columns.
// This formats a JS Date - which must already be UTC-midnight
// (e.g. via getCurrentDate()/addDays, or a plain `new Date()` for
// now-timestamps) - into that plain YYYY-MM-DD shape.
function toDirectusDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ============================================================================
// VIENNA EXAMPLE IDENTITIES
// ============================================================================

// Roughly representative of Vienna's population mix: majority
// German/Austrian names, plus realistic shares of the city's largest
// migrant-background communities (ex-Yugoslavia, Turkey, Poland, Romania,
// Hungary, Middle East/Afghanistan, Czechia/Slovakia). Names are drawn
// independently from first/last-name pools per group (with repeats allowed
// across the population - realistic at this scale, and email uniqueness is
// handled separately), rather than a fixed list of pairs, so the generator
// scales to any population size.
interface NameGroup {
  weight: number;
  firstNames: string[];
  lastNames: string[];
}

const NAME_GROUPS: NameGroup[] = [
  {
    weight: 0.6,
    firstNames: [
      "Lukas", "Sophie", "Maximilian", "Anna", "Felix", "Laura", "Jakob", "Emma",
      "David", "Lena", "Paul", "Marie", "Simon", "Julia", "Tobias", "Sarah",
      "Florian", "Lisa", "Daniel", "Nina", "Michael", "Katharina", "Sebastian",
      "Sabrina", "Christoph", "Vanessa", "Andreas", "Jasmin", "Thomas", "Melanie",
      "Stefan", "Carina", "Markus", "Michaela", "Christian", "Petra", "Martin",
      "Elisabeth", "Bernhard", "Barbara", "Alexander", "Nicole", "Patrick",
      "Verena", "Manuel", "Theresa", "Georg", "Philipp", "Kathrin", "Matthias",
      "Sandra", "Robert", "Claudia", "Wolfgang", "Andrea", "Peter", "Ursula",
      "Franz", "Gabriele",
    ],
    lastNames: [
      "Gruber", "Huber", "Bauer", "Wagner", "Pichler", "Steiner", "Moser", "Mayer",
      "Berger", "Fuchs", "Winkler", "Schmid", "Wolf", "Eder", "Fischer", "Weber",
      "Schneider", "Maier", "Hofer", "Leitner", "Wimmer", "Auer", "Brunner",
      "Binder", "Egger", "Wallner", "Reiter", "Aigner", "Baumgartner", "Lang",
      "Grabner", "Hummel", "Wieser", "Neumann", "Schwarz", "Riegler", "Wurm",
      "Schuster", "Haas", "Fellner", "Lechner", "Fuerst", "Zach", "Holzer",
      "Kogler", "Perner", "Standler", "Kastner", "Aichinger", "Schaller",
      "Preining", "Hutter", "Kern", "Fink", "Sailer", "Wiesinger", "Riedl",
      "Gansch", "Steinbauer", "Haider",
    ],
  },
  {
    // Ex-Yugoslavia: Serbian / Bosnian / Croatian
    weight: 0.12,
    firstNames: [
      "Marko", "Ana", "Stefan", "Jovana", "Nikola", "Milica", "Aleksandar",
      "Ivana", "Goran", "Snežana", "Dejan", "Tijana", "Miloš", "Jelena",
      "Vladimir", "Marija", "Draženka", "Zoran", "Nemanja", "Tamara",
    ],
    lastNames: [
      "Jovanović", "Petrović", "Nikolić", "Marković", "Popović", "Ilić",
      "Kovačević", "Horvat", "Babić", "Đorđević", "Stanković", "Radić",
      "Pavlović", "Kovač", "Simić", "Todorović", "Knežević", "Perić",
      "Maksimović", "Vuković",
    ],
  },
  {
    weight: 0.08,
    firstNames: [
      "Emre", "Elif", "Mustafa", "Zeynep", "Burak", "Aylin", "Hakan", "Merve",
      "Emir", "Selin", "Yusuf", "Deniz", "Kerem", "Ebru", "Ozan", "Gül",
    ],
    lastNames: [
      "Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Arslan",
      "Doğan", "Öztürk", "Aksoy", "Güneş", "Yıldırım", "Şimşek", "Çetin", "Polat",
    ],
  },
  {
    weight: 0.06,
    firstNames: [
      "Piotr", "Katarzyna", "Tomasz", "Agnieszka", "Marcin", "Magdalena",
      "Paweł", "Anna", "Krzysztof", "Aleksandra", "Michał", "Ewa", "Grzegorz",
      "Joanna",
    ],
    lastNames: [
      "Kowalski", "Nowak", "Wiśniewski", "Wójcik", "Kamiński", "Zielińska",
      "Lewandowski", "Dąbrowski", "Kaczmarek", "Piotrowski", "Grabowski",
      "Zając", "Krawczyk", "Szymański",
    ],
  },
  {
    weight: 0.04,
    firstNames: [
      "Andrei", "Elena", "Mihai", "Ioana", "Adrian", "Cristina", "Alexandru",
      "Diana",
    ],
    lastNames: [
      "Popescu", "Ionescu", "Popa", "Dumitru", "Stoica", "Rusu", "Munteanu",
      "Constantin",
    ],
  },
  {
    weight: 0.03,
    firstNames: ["Gábor", "Zsófia", "László", "Bence", "Eszter", "Zoltán"],
    lastNames: ["Nagy", "Kovács", "Tóth", "Horváth", "Varga", "Szabó"],
  },
  {
    // Middle East / Afghanistan
    weight: 0.04,
    firstNames: [
      "Ahmad", "Layla", "Omar", "Fatima", "Amir", "Sara", "Hamid", "Zahra",
    ],
    lastNames: [
      "Ahmadi", "Hussaini", "Khalil", "Al-Sayed", "Rahimi", "Karimi",
      "Rostami", "Yousafzai",
    ],
  },
  {
    weight: 0.03,
    firstNames: ["Jan", "Petra", "Martin", "Tomáš", "Eva", "Pavel"],
    lastNames: ["Novák", "Svobodová", "Dvořák", "Procházka", "Horák", "Novotná"],
  },
];

function generateIdentities(n: number): [string, string][] {
  const groupItems = NAME_GROUPS.map((g) => ({ weight: g.weight, value: g }));
  const result: [string, string][] = [];
  for (let i = 0; i < n; i++) {
    const group = pickWeighted(groupItems);
    const first = group.firstNames[Math.floor(rng() * group.firstNames.length)]!;
    const last = group.lastNames[Math.floor(rng() * group.lastNames.length)]!;
    result.push([first, last]);
  }
  return result;
}

const DIACRITIC_MAP: Record<string, string> = {
  ł: "l",
  Ł: "L",
  đ: "dj",
  Đ: "Dj",
  ı: "i",
  İ: "I",
  ğ: "g",
  Ğ: "G",
};

function slugifyForEmail(name: string): string {
  let out = "";
  for (const ch of name) {
    out += DIACRITIC_MAP[ch] ?? ch;
  }
  return out
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Assigns deterministic, unique emails to a (possibly-duplicate-containing)
 * identity list, appending a numeric suffix on collision. Order-dependent,
 * so it's stable across reruns as long as the identity list itself is. */
function assignUniqueEmails(identities: [string, string][]): string[] {
  const counts = new Map<string, number>();
  return identities.map(([first, last]) => {
    const base = `${slugifyForEmail(first)}.${slugifyForEmail(last)}`;
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    return `${base}${n > 1 ? n : ""}@example.com`;
  });
}

// ============================================================================
// CALIBRATION CONSTANTS
// Loosely and approximately calibrated from a production export (see scripts/export-shift-stats.ts). Comments name which stat a figure is
// loosely based on, not its precise real value. Constants that are the
// author's own assumption rather than a measured stat (noted individually)
// were left untouched, since there's no real figure to protect.
// ============================================================================

// loosely: memberships.total_count
const TARGET_TOTAL_MEMBERSHIPS = 1700;

// loosely: memberships.status_type_crosstab
const MEMBERSHIP_STATUS_WEIGHTS: { type: string; status: string; weight: number }[] = [
  { type: "Aktiv", status: "approved", weight: 1276.9 },
  { type: "Aktiv", status: "applied", weight: 57.7 },
  { type: "Aktiv", status: "widerrufen", weight: 28.7 },
  { type: "Aktiv", status: "in-cancellation", weight: 38.7 },
  { type: "Aktiv", status: "ended", weight: 17.2 },
  { type: "Investierend", status: "approved", weight: 161.7 },
  { type: "Investierend", status: "ended", weight: 4.0 },
  { type: "Investierend", status: "in-cancellation", weight: 1.0 },
  { type: "Investierend", status: "applied", weight: 3.9 },
];

// loosely: memberships.shifts_user_type_mix
const USER_TYPE_WEIGHTS: { userType: string; weight: number }[] = [
  { userType: "regular", weight: 1182.4 },
  { userType: "inactive", weight: 228.2 },
  { userType: "exempt", weight: 140.6 },
];

// "Active" = memberships_type Aktiv AND memberships_status approved, matching
// the filter dbGetMembershipsForDecrement uses for the weekly counter cronjob.
function isActive(status: string, type: string): boolean {
  return type === "Aktiv" && status === "approved";
}

// loosely: currently-active regular assignee count (shifts_assignments).
const REGULAR_ASSIGNEE_TARGET = 244;
// loosely: shifts_assignments.future_onetime_lead_time_days.count -
// currently-future one-time bookings. Distributed across ~1.5 tickets/person
// on average.
const ONE_TIME_TARGET_TICKETS = 344;
const ONE_TIME_TARGET_PEOPLE = Math.round(ONE_TIME_TARGET_TICKETS / 1.5);
// No real joint stat for this overlap; kept modest and deliberate.
const ONE_TIME_FROM_REGULAR_RATE = 0.1;

// loosely: skills[].member_count relative to the active membership count
const COORDINATOR_RATE = 0.06053;
const CHEESE_RATE = 0.04767;

// loosely: memberships_coshoppers.total relative to memberships.total_count
const COSHOPPER_RATE = 639 / 1621;

// loosely: shifts_absences.percent_active_members_on_holiday_today - an
// instantaneous snapshot ("on holiday right now").
const ON_HOLIDAY_TODAY_RATE = 0.05938;
// loosely: shifts_absences.holiday_duration_days.histogram, as
// [minDays, maxDays, weight]
const HOLIDAY_DURATION_BUCKETS: [number, number, number][] = [
  [1, 6, 77.8],
  [7, 13, 121.9],
  [14, 20, 150.5],
  [21, 29, 73.9],
  [30, 59, 80.0],
  [60, 120, 57.0],
];
const AVG_HOLIDAY_DURATION_DAYS =
  HOLIDAY_DURATION_BUCKETS.reduce((sum, [min, max, weight]) => sum + ((min + max) / 2) * weight, 0) /
  HOLIDAY_DURATION_BUCKETS.reduce((sum, [, , weight]) => sum + weight, 0);
// holidayIdx (below) models "starts a holiday sometime within
// [-HOLIDAY_LOOKBACK_DAYS, +HOLIDAY_WINDOW_DAYS] of today" - a cumulative
// span, not an instantaneous snapshot like ON_HOLIDAY_TODAY_RATE. Convert
// via Little's law (steady-state fraction-on-holiday = daily-start-rate *
// avg-duration, so daily-start-rate = ON_HOLIDAY_TODAY_RATE / avg-duration),
// then scale that daily rate up by the span length. The span must extend
// into the past too: draws restricted to [0, window) only ever start
// holidays in the future, so "on holiday today" stays ~0 and only ramps up
// as the window fills in - the lookback (>= the longest modeled duration)
// lets already-ongoing holidays exist on day 0 as well, so the steady state
// is reached immediately instead of after HOLIDAY_WINDOW_DAYS.
const HOLIDAY_WINDOW_DAYS = 75;
const HOLIDAY_LOOKBACK_DAYS = HOLIDAY_DURATION_BUCKETS.reduce(
  (max, [, bucketMax]) => Math.max(max, bucketMax),
  0,
);
const HOLIDAY_SPAN_DAYS = HOLIDAY_LOOKBACK_DAYS + HOLIDAY_WINDOW_DAYS;
const HOLIDAY_START_RATE =
  (ON_HOLIDAY_TODAY_RATE / AVG_HOLIDAY_DURATION_DAYS) * HOLIDAY_SPAN_DAYS;

// loosely: memberships.active_shifts_counter.histogram (shift-points balance)
// - -29 is a distinct value. Applied to every membership here (active or not).
const SHIFTS_COUNTER_BUCKETS: [number, number, number][] = [
  [-29, -29, 536],
  [-84, -11, 124],
  [-10, -1, 74],
  [0, 9, 90],
  [10, 19, 104],
  [20, 29, 82],
  [30, 49, 144],
  [50, 150, 146],
];

function pickShiftsCounter(): number {
  const [min, max] = pickWeighted(
    SHIFTS_COUNTER_BUCKETS.map(([bucketMin, bucketMax, weight]) => ({
      weight,
      value: [bucketMin, bucketMax] as const,
    })),
  );
  return randomInt(min, max);
}

// loosely: shifts_absences.single_occurrence_cancellations.onetime_cancellations
// relative to the total one-time assignments ever made - applied per
// one-time ticket independently.
const ONE_TIME_CANCEL_RATE = 0.13859;
// regular_occurrence_unsubscribes averaged a few skips per ever-regular
// assignment in production, but there's no per-member distribution
// available, so: half of regular assignees get 1-4 skips logged, a
// reasonable approximation of that aggregate average (not a production
// stat itself, so not perturbed).
const REGULAR_UNSUBSCRIBE_CHANCE = 0.5;

// loosely: shifts_logs.type_mix / .score - attendance history for regular
// assignees
const SHIFT_LOG_TYPE_WEIGHTS: { type: string; weight: number }[] = [
  { type: "attended", weight: 7183.2 },
  { type: "attended_draft", weight: 229.6 },
  { type: "cancelled", weight: 2.1 },
  { type: "missed", weight: 244.4 },
  { type: "other", weight: 61.3 },
];
// How much history to generate.
const SHIFT_LOG_HISTORY_MONTHS = 3;

// loosely: buddy_status mix (directus_users, role NutzerInnen)
const BUDDY_STATUS_WEIGHTS: { status: string; weight: number }[] = [
  { status: "keine_angabe", weight: 1727.5 },
  { status: "is_buddy", weight: 6.8 },
  { status: "need_buddy", weight: 2.1 },
];

// shifts_categories.categories
const CATEGORY_DEFINITIONS: {
  oldId: number;
  name: string;
  beschreibung: string | null;
  for_all: boolean;
  adoptionPercent: number;
}[] = [
  { oldId: 1, name: "IT Support", beschreibung: null, for_all: false, adoptionPercent: 0.19 },
  { oldId: 2, name: "Angestellte", beschreibung: null, for_all: false, adoptionPercent: 3.11 },
  { oldId: 3, name: "Mitgliederbüro", beschreibung: null, for_all: false, adoptionPercent: 1.58 },
  { oldId: 4, name: "Schichtkoordination", beschreibung: null, for_all: false, adoptionPercent: 2.84 },
  { oldId: 5, name: "AG 5", beschreibung: null, for_all: false, adoptionPercent: 0.2 },
  { oldId: 6, name: "Öffentlichkeitsarbeit", beschreibung: null, for_all: false, adoptionPercent: 1.26 },
  { oldId: 7, name: "Schulungen", beschreibung: null, for_all: true, adoptionPercent: 98.01 },
  { oldId: 8, name: "Veranstaltungen", beschreibung: null, for_all: true, adoptionPercent: 1.26 },
  {
    oldId: 9,
    name: "Normal",
    beschreibung:
      "Vor Schicht-Beginn ziehe dir bitte eine Schürze an, stecke dein Namens-Schild an und wasche dir die Hände. Zu Schicht-Beginn treffen wir uns zum Check-In am Schicht-Board, wo wir alles Weitere besprechen.",
    for_all: true,
    adoptionPercent: 0,
  },
  {
    oldId: 10,
    name: "Inventur",
    beschreibung:
      "Diese Schicht ist ideal für alle, die nicht so gerne kassieren. Einmal gemeinsam alles durchzählen, was wir im Supermarkt auf Lager haben, that's it.",
    for_all: true,
    adoptionPercent: 0,
  },
  {
    oldId: 11,
    name: "Mistplatz Fahren",
    beschreibung:
      "Alle 2-3 Wochen müssen hölzerne Einwegpaletten und einiges an Einwegkisten zum Mistplatz gebracht werden, mit einem eigenen Auto.",
    for_all: true,
    adoptionPercent: 0,
  },
  { oldId: 12, name: "Website", beschreibung: null, for_all: false, adoptionPercent: 0.2 },
  { oldId: 14, name: "Möbelbau", beschreibung: null, for_all: false, adoptionPercent: 0 },
];

// loosely: null share of shifts.category_mix (53.5 of 445.7 total weight).
// SHIFT_ARCHETYPES already encodes the real category joint distribution
// (which slot/time/points shape goes with which category), so that's used
// as the primary category source below - this rate only decides whether an
// otherwise-categorized archetype gets its category nulled out
// (uncategorized), independent of its slots/time/points.
const SHIFT_UNCATEGORIZED_RATE = 53.5 / 445.7;

// loosely: shifts.status_mix
const SHIFT_STATUS_WEIGHTS: { status: string; weight: number }[] = [
  { status: "published", weight: 392.6 },
  { status: "archived", weight: 60.0 },
  { status: "draft", weight: 7.2 },
];

// loosely: shifts.other_shifts_summary + active_recurring_ongoing.length -
// real shape mix across all shifts
const SHIFT_SHAPE_TARGETS = {
  activeRecurringOngoing: 152,
  regularWithPastEndDate: 94,
  oneTimeDefinitions: 178,
};

// Distinct (slots, from_time, to_time, repeats_every, category, points,
// self-assignment, exclude-holidays, all-day) combinations, with their
// frequency - used as a weighted template pool instead of a single fixed
// pattern, so generated shifts match the real slot/time/category shape.
interface ShiftArchetype {
  slots: number;
  fromTime: string | null;
  toTime: string | null;
  repeatsEvery: number;
  categoryOldId: number | null;
  points: number;
  allowSelfAssignment: boolean;
  excludeHolidays: boolean;
  isAllDay: boolean;
  weight: number;
}

const SHIFT_ARCHETYPES: ShiftArchetype[] = [
  { slots: 7, fromTime: "18:00:00", toTime: "20:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 16 },
  { slots: 6, fromTime: "06:00:00", toTime: "08:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 12 },
  { slots: 5, fromTime: "08:15:00", toTime: "11:00:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 8 },
  { slots: 5, fromTime: "10:45:00", toTime: "13:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 8 },
  { slots: 5, fromTime: "15:45:00", toTime: "18:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 8 },
  { slots: 5, fromTime: "13:15:00", toTime: "16:00:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 8 },
  { slots: 7, fromTime: "08:15:00", toTime: "11:00:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 8 },
  { slots: 7, fromTime: "10:45:00", toTime: "13:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 8 },
  { slots: 6, fromTime: "15:45:00", toTime: "18:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 8 },
  { slots: 6, fromTime: "13:15:00", toTime: "16:00:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 8 },
  { slots: 7, fromTime: "13:15:00", toTime: "16:00:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 7, fromTime: "06:00:00", toTime: "08:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 7, fromTime: "15:45:00", toTime: "18:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 5, fromTime: "06:30:00", toTime: "09:00:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 5, fromTime: "08:45:00", toTime: "11:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 7, fromTime: "11:15:00", toTime: "14:00:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 6, fromTime: "13:45:00", toTime: "16:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 7, fromTime: "16:15:00", toTime: "18:45:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 1, fromTime: "06:00:00", toTime: "13:30:00", repeatsEvery: 7, categoryOldId: 2, points: 5, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 1, fromTime: "13:00:00", toTime: "20:30:00", repeatsEvery: 7, categoryOldId: 2, points: 5, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 1, fromTime: null, toTime: null, repeatsEvery: 28, categoryOldId: 3, points: 28, allowSelfAssignment: true, excludeHolidays: false, isAllDay: true, weight: 4 },
  { slots: 2, fromTime: "16:00:00", toTime: "19:00:00", repeatsEvery: 28, categoryOldId: 3, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 2, fromTime: "12:45:00", toTime: "15:30:00", repeatsEvery: 28, categoryOldId: 9, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 4 },
  { slots: 2, fromTime: null, toTime: null, repeatsEvery: 28, categoryOldId: 6, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: true, weight: 3 },
  { slots: 2, fromTime: null, toTime: null, repeatsEvery: 28, categoryOldId: 6, points: 28, allowSelfAssignment: true, excludeHolidays: false, isAllDay: true, weight: 1 },
  { slots: 1, fromTime: "13:00:00", toTime: "18:30:00", repeatsEvery: 7, categoryOldId: 2, points: 5, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 1 },
  { slots: 1, fromTime: "06:30:00", toTime: "13:00:00", repeatsEvery: 7, categoryOldId: 2, points: 5, allowSelfAssignment: true, excludeHolidays: false, isAllDay: false, weight: 1 },
  { slots: 1, fromTime: "12:30:00", toTime: "18:45:00", repeatsEvery: 7, categoryOldId: 2, points: 5, allowSelfAssignment: true, excludeHolidays: false, isAllDay: false, weight: 1 },
  { slots: 1, fromTime: null, toTime: null, repeatsEvery: 28, categoryOldId: 1, points: 28, allowSelfAssignment: false, excludeHolidays: false, isAllDay: true, weight: 1 },
  { slots: 1, fromTime: "12:00:00", toTime: "14:00:00", repeatsEvery: 21, categoryOldId: 11, points: 28, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 1 },
  { slots: 30, fromTime: "17:30:00", toTime: "19:00:00", repeatsEvery: 14, categoryOldId: 7, points: 0, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 1 },
  { slots: 3, fromTime: "00:00:00", toTime: null, repeatsEvery: 28, categoryOldId: 12, points: 28, allowSelfAssignment: true, excludeHolidays: false, isAllDay: true, weight: 1 },
  { slots: 4, fromTime: "16:00:00", toTime: "18:00:00", repeatsEvery: 7, categoryOldId: 7, points: 14, allowSelfAssignment: true, excludeHolidays: true, isAllDay: false, weight: 1 },
];

function pickArchetype(): ShiftArchetype {
  return pickWeighted(SHIFT_ARCHETYPES.map((a) => ({ weight: a.weight, value: a })));
}

// shifts.active_recurring_ongoing filtered to shifts_category_2 === 9
// ("Normal", the day-to-day supermarket shifts)
const NORMAL_CATEGORY_OLD_ID = 9;
const NORMAL_CATEGORY_SHIFTS: { name: string; slots: number; fromTime: string; toTime: string }[] = [
  { name: "ADi-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "ADi-08:15", slots: 5, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "ADi-10:45", slots: 5, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "ADi-13:15", slots: 5, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "ADi-15:45", slots: 5, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "ADi-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "ADo-06:00 English-speaking shift", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "ADo-08:15", slots: 7, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "ADo-10:45", slots: 7, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "ADo-13:15", slots: 7, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "ADo-15:45", slots: 6, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "ADo-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "AFr-06:00", slots: 7, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "AFr-08:15", slots: 7, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "AFr-10:45", slots: 7, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "AFr-13:15", slots: 6, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "AFr-15:45", slots: 7, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "AFr-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "AMi-12:45 Detektiv Inventur", slots: 2, fromTime: "12:45:00", toTime: "15:30:00" },
  { name: "AMi-13:15", slots: 6, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "AMi-15:45", slots: 6, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "AMo-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "AMo-08:15", slots: 5, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "AMo-10:45", slots: 5, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "AMo-13:15", slots: 5, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "AMo-15:45", slots: 5, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "AMo-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "ASa-06:30", slots: 5, fromTime: "06:30:00", toTime: "09:00:00" },
  { name: "ASa-08:45", slots: 5, fromTime: "08:45:00", toTime: "11:30:00" },
  { name: "ASa-11:15", slots: 7, fromTime: "11:15:00", toTime: "14:00:00" },
  { name: "ASa-13:45", slots: 6, fromTime: "13:45:00", toTime: "16:30:00" },
  { name: "ASa-16:15", slots: 7, fromTime: "16:15:00", toTime: "18:45:00" },
  { name: "BDi-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "BDi-08:15", slots: 5, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "BDi-10:45", slots: 5, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "BDi-13:15", slots: 5, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "BDi-15:45", slots: 5, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "BDi-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "BDo-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "BDo-08:15", slots: 7, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "BDo-10:45", slots: 7, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "BDo-13:15", slots: 7, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "BDo-15:45", slots: 6, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "BDo-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "BFr-06:00", slots: 7, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "BFr-08:15", slots: 7, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "BFr-10:45", slots: 7, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "BFr-13:15 English-speaking shift", slots: 6, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "BFr-15:45", slots: 7, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "BFr-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "BMi-12:45 Detektiv Inventur", slots: 2, fromTime: "12:45:00", toTime: "15:30:00" },
  { name: "BMi-13:15", slots: 6, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "BMi-15:45", slots: 6, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "BMo-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "BMo-08:15", slots: 5, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "BMo-10:45", slots: 5, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "BMo-13:15", slots: 5, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "BMo-15:45", slots: 5, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "BMo-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "BSa-06:30", slots: 5, fromTime: "06:30:00", toTime: "09:00:00" },
  { name: "BSa-08:45", slots: 5, fromTime: "08:45:00", toTime: "11:30:00" },
  { name: "BSa-11:15", slots: 7, fromTime: "11:15:00", toTime: "14:00:00" },
  { name: "BSa-13:45", slots: 6, fromTime: "13:45:00", toTime: "16:30:00" },
  { name: "BSa-16:15", slots: 7, fromTime: "16:15:00", toTime: "18:45:00" },
  { name: "CDi-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "CDi-08:15", slots: 5, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "CDi-10:45", slots: 5, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "CDi-13:15", slots: 5, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "CDi-15:45", slots: 5, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "CDi-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "CDo-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "CDo-08:15", slots: 7, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "CDo-10:45", slots: 7, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "CDo-13:15", slots: 7, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "CDo-15:45", slots: 6, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "CDo-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "CFr-06:00", slots: 7, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "CFr-08:15", slots: 7, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "CFr-10:45", slots: 7, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "CFr-13:15", slots: 6, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "CFr-15:45", slots: 7, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "CFr-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "CMi-12:45 Detektiv Inventur", slots: 2, fromTime: "12:45:00", toTime: "15:30:00" },
  { name: "CMi-13:15", slots: 6, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "CMi-15:45", slots: 6, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "CMo-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "CMo-08:15", slots: 5, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "CMo-10:45", slots: 5, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "CMo-13:15", slots: 5, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "CMo-15:45", slots: 5, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "CMo-18:00 English-speaking shift", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "CSa-06:30", slots: 5, fromTime: "06:30:00", toTime: "09:00:00" },
  { name: "CSa-08:45", slots: 5, fromTime: "08:45:00", toTime: "11:30:00" },
  { name: "CSa-11:15", slots: 7, fromTime: "11:15:00", toTime: "14:00:00" },
  { name: "CSa-13:45", slots: 6, fromTime: "13:45:00", toTime: "16:30:00" },
  { name: "CSa-16:15", slots: 7, fromTime: "16:15:00", toTime: "18:45:00" },
  { name: "DDi-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "DDi-08:15", slots: 5, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "DDi-10:45", slots: 5, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "DDi-13:15", slots: 5, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "DDi-15:45", slots: 5, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "DDi-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "DDo-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "DDo-08:15", slots: 7, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "DDo-10:45", slots: 7, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "DDo-13:15", slots: 7, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "DDo-15:45", slots: 6, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "DDo-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "DFr-06:00", slots: 7, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "DFr-08:15", slots: 7, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "DFr-10:45", slots: 7, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "DFr-13:15", slots: 6, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "DFr-15:45", slots: 7, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "DFr-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "DMi-12:45 Detektiv Inventur", slots: 2, fromTime: "12:45:00", toTime: "15:30:00" },
  { name: "DMi-13:15", slots: 6, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "DMi-15:45", slots: 6, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "DMo-06:00", slots: 6, fromTime: "06:00:00", toTime: "08:30:00" },
  { name: "DMo-08:15", slots: 5, fromTime: "08:15:00", toTime: "11:00:00" },
  { name: "DMo-10:45", slots: 5, fromTime: "10:45:00", toTime: "13:30:00" },
  { name: "DMo-13:15", slots: 5, fromTime: "13:15:00", toTime: "16:00:00" },
  { name: "DMo-15:45", slots: 5, fromTime: "15:45:00", toTime: "18:30:00" },
  { name: "DMo-18:00", slots: 7, fromTime: "18:00:00", toTime: "20:30:00" },
  { name: "DSa-06:30", slots: 5, fromTime: "06:30:00", toTime: "09:00:00" },
  { name: "DSa-08:45", slots: 5, fromTime: "08:45:00", toTime: "11:30:00" },
  { name: "DSa-11:15", slots: 7, fromTime: "11:15:00", toTime: "14:00:00" },
  { name: "DSa-13:45 English-speaking shift", slots: 6, fromTime: "13:45:00", toTime: "16:30:00" },
  { name: "DSa-16:15", slots: 7, fromTime: "16:15:00", toTime: "18:45:00" },
];

const WEEK_TYPE_OFFSET: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
const WEEKDAY_OFFSET: Record<string, number> = { Mo: 0, Di: 1, Mi: 2, Do: 3, Fr: 4, Sa: 5, So: 6 };
const NORMAL_SHIFT_NAME_PATTERN = /^([A-D])(Mo|Di|Mi|Do|Fr|Sa|So)-/;

function parseNormalShiftName(name: string): { weekType: string; weekday: string } {
  const match = NORMAL_SHIFT_NAME_PATTERN.exec(name);
  if (!match) throw new Error(`Cannot parse weekType/weekday out of shift name: ${name}`);
  return { weekType: match[1]!, weekday: match[2]! };
}

function pickShiftStatus(): string {
  return pickWeighted(SHIFT_STATUS_WEIGHTS.map((s) => ({ weight: s.weight, value: s.status })));
}

function pickHolidayDurationDays(): number {
  const bucket = pickWeighted(
    HOLIDAY_DURATION_BUCKETS.map(([min, max, weight]) => ({ weight, value: [min, max] as const })),
  );
  return randomInt(bucket[0], bucket[1]);
}

async function getRole(name: string) {
  const directus = await useDirectusAdmin();

  const membersRoles = await directus.request(
    readRoles({
      filter: {
        name: { _eq: name },
      },
    }),
  );

  if (membersRoles.length < 1) {
    throw new Error(name + " role not found");
  }

  return membersRoles[0]!.id;
}

async function create_examples(totalMemberships: number) {
  console.info(`Creating example data for collectivo (${totalMemberships} fake memberships)`);
  rng = makeRng(42);
  await create_users();
  const fakeUsers = await create_fake_users(totalMemberships);
  const plan = buildFakePlan(fakeUsers.length);
  await purge_assignments();
  await create_memberships();
  await prune_orphan_fake_users(new Set(fakeUsers.map((u) => u.email)));
  await create_tags();
  await create_tiles();
  await create_emails();
  await create_settings();
  const categoryMap = await create_fake_categories();
  await create_shifts(categoryMap);
  const skills = await create_skills();
  const fakeMemberships = await create_fake_memberships(fakeUsers, plan);
  await create_fake_coshoppers(fakeMemberships, plan);
  await create_fake_shift_data(fakeMemberships, plan, skills, categoryMap);
  console.log("Seed successful");
}

const EXAMPLE_USER_NAMES = ["Admin", "Editor", "User", "Alice", "Bob", "Charlie", "Dave"];

function exampleUserEmail(userName: string): string {
  return `${userName.toLowerCase()}@example.com`;
}

async function create_users() {
  const directus = await useDirectusAdmin();
  const userRole = await getRole("NutzerInnen");
  const editorRole = await getRole("Mitgliederverwaltung");
  const adminRole = await getRole("Administrator");

  // Create some users
  console.info("Creating users");

  const users = [];

  for (const userName of EXAMPLE_USER_NAMES) {
    const email = exampleUserEmail(userName);

    const u = {
      first_name: userName,
      last_name: "Example",
      username: userName,
      username_last: "Example",
      email: email,
      password: `${userName.toLowerCase()}`,
      role: userRole,
      status: "active",
      memberships_street: "Example Street",
      memberships_city: "Example City",
      memberships_streetnumber: "123",
      memberships_postcode: "12345",
    };

    if (userName == "Admin") {
      u.role = adminRole;
    }

    if (userName == "Editor") {
      u.role = editorRole;
    }

    users.push(u);
  }

  for (const user of users) {
    const usersDB = await directus.request(
      readUsers({
        filter: { email: { _eq: user.email } },
      }),
    );

    let userID;

    if (usersDB.length > 0) {
      userID = usersDB[0]!.id;
      // tslint:disable-next-line:no-console
      // console.info("Updating user " + user.email + " with ID " + userID);
      await directus.request(updateUser(userID, user));
      // tslint:disable-next-line:no-console
    } else {
      // tslint:disable-next-line:no-console
      console.info("Creating user " + user.email);
      const us = await directus.request(createUser(user));
      userID = us.id;
    }
  }
}

interface FakeUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

async function create_fake_users(totalMemberships: number): Promise<FakeUser[]> {
  const directus = await useDirectusAdmin();
  const userRole = await getRole("NutzerInnen");

  console.info(`Creating ${totalMemberships} fake Vienna users`);

  const identities = generateIdentities(totalMemberships);
  const emails = assignUniqueEmails(identities);
  const buddyStatuses = identities.map(() =>
    pickWeighted(BUDDY_STATUS_WEIGHTS.map((b) => ({ weight: b.weight, value: b.status }))),
  );

  // GET-based lookup - keep the _in filter small enough to stay under
  // request header/URL size limits (500 emails in one filter causes a 431).
  const existing = await inChunks(emails, EMAIL_LOOKUP_CHUNK_SIZE, (chunk) =>
    directus.request(
      readUsers({
        filter: { email: { _in: chunk } },
        fields: ["id", "email"],
        limit: -1,
      }),
    ) as Promise<{ id: string; email: string }[]>,
  );
  const existingByEmail = new Map(existing.map((u) => [u.email, u.id]));

  const toCreate: any[] = [];
  identities.forEach(([first, last], i) => {
    const email = emails[i]!;
    if (existingByEmail.has(email)) return;
    toCreate.push({
      first_name: first,
      last_name: last,
      username: first,
      username_last: last,
      email,
      password: slugifyForEmail(first),
      role: userRole,
      status: "active",
      buddy_status: buddyStatuses[i],
      memberships_street: "Example Street",
      memberships_city: "Example City",
      memberships_streetnumber: "123",
      memberships_postcode: "12345",
    });
  });

  const created = await inChunks(toCreate, USER_CREATE_CHUNK_SIZE, (chunk) =>
    directus.request(
      createUsers(chunk, { fields: ["id", "email"] } as any),
    ) as unknown as Promise<{ id: string; email: string }[]>,
  );
  const createdByEmail = new Map(created.map((u) => [u.email, u.id]));

  return identities.map(([first, last], i) => {
    const email = emails[i]!;
    const id = existingByEmail.get(email) ?? createdByEmail.get(email)!;
    return { id, first_name: first, last_name: last, email };
  });
}

// Fake users are matched/reused by email (see create_fake_users above), never
// pruned - so changing the name pools, TARGET_TOTAL_MEMBERSHIPS, or the rng
// seed leaves the previous cohort behind as orphan users with no membership,
// stacking across runs. Must run after create_memberships() has purged all
// memberships (including the previous cohort's), so no FK still points at
// the users being deleted here.
async function prune_orphan_fake_users(currentEmails: Set<string>) {
  const directus = await useDirectusAdmin();
  const userRole = await getRole("NutzerInnen");

  console.info("Pruning orphaned fake users from earlier seed runs");

  const existing = (await directus.request(
    readUsers({
      filter: {
        role: { _eq: userRole },
        email: { _ends_with: "@example.com" },
      },
      fields: ["id", "email"],
      limit: -1,
    }),
  )) as { id: string; email: string }[];

  const fixedEmails = new Set(EXAMPLE_USER_NAMES.map(exampleUserEmail));
  // Narrows the match to the exact shape assignUniqueEmails produces
  // (first.last, optionally followed by a collision-suffix digit) so a
  // hand-made local test account that also happens to end in @example.com
  // isn't swept up just for not being in the current cohort.
  const GENERATED_EMAIL_LOCAL_PART = /^[a-z]+\.[a-z]+\d*$/;
  const orphans = existing.filter(
    (u) =>
      !fixedEmails.has(u.email) &&
      !currentEmails.has(u.email) &&
      GENERATED_EMAIL_LOCAL_PART.test(u.email.split("@")[0] ?? ""),
  );

  if (orphans.length === 0) return;
  console.info(`Deleting ${orphans.length} orphaned fake user(s): ${orphans.map((u) => u.email).join(", ")}`);
  await inChunks(
    orphans.map((u) => u.id),
    BULK_CHUNK_SIZE,
    (chunk) => directus.request(deleteUsers(chunk)).then(() => []),
  );
}

async function create_tags() {
  const directus = await useDirectusAdmin();

  // Create some tags
  console.info("Creating tags");

  await purgeAll("collectivo_tags");
  const tagNames = ["Has a dog", "Has a cat", "Has a bird", "Has a fish"];
  const tags: object[] = [];

  for (const tagName of tagNames) {
    tags.push({
      tags_name: tagName,
    });
  }

  try {
    await directus.request(createItems("collectivo_tags", tags));
  } catch (error) {
    console.info(error);
  }
}
async function create_emails() {
  const directus = await useDirectusAdmin();
  // Create email templates
  console.info("Creating email templates");
  await purgeAll("messages_templates");
  const templates = [];

  for (const i in [1, 2, 3]) {
    templates.push({
      messages_name: `Example Template ${i}`,
      messages_method: "email",
      messages_subject: `Example Subject ${i}`,
      messages_content:
        "Hello {{recipient_first_name}} {{recipient_last_name}}. \n This is a second line.",
    });
  }

  const templateIds = [];

  try {
    const ids = await directus.request(
      createItems("messages_templates", templates),
    );

    templateIds.push(...ids);
  } catch (error) {
    console.info(error);
  }
}
async function create_tiles() {
  const directus = await useDirectusAdmin();
  // Create some tiles
  console.info("Creating tiles");
  await purgeAll("collectivo_tiles");

  const tileData = [
    {
      name: "Tile 1",
      color: "primary",
    },
    {
      name: "Tile 2",
      color: "green",
    },
    {
      name: "Tile 3",
      color: "orange",
    },
    {
      name: "Tile 4",
      color: "blue",
    },
  ];

  const tiles = [];

  const tileButton = {
    tiles_label: "Example Button",
    tiles_path: "/some/path",
    tiles_tile: "",
  };

  for (const td of tileData) {
    tiles.push({
      tiles_name: td.name,
      tiles_content: "Hello! I am an example tile!",
      tiles_color: td.color,
      tiles_status: "published",
    });
  }

  try {
    const tilesRes = await directus.request(
      createItems("collectivo_tiles", tiles),
    );

    for (const tile of tilesRes) {
      tileButton.tiles_tile = String(tile.id);

      await directus.request(
        createItem("collectivo_tiles_buttons", tileButton),
      );
    }
  } catch (error) {
    console.info(error);
  }
}

// Must run before create_memberships() purges memberships: shifts_logs and
// shifts_absences both have a required (not-null) shifts_membership column,
// so deleting a membership while those still reference it violates the
// not-null constraint on the FK's nullify-on-delete behavior.
async function purge_assignments() {
  console.info("Purging shift assignments");

  await purgeAll("shifts_logs");
  await purgeAll("shifts_absences");
  await purgeAll("shifts_assignments");
  // Also purged here, before create_memberships() below deletes memberships:
  // the junction's FK to memberships is nullable/SET NULL (unlike
  // shifts_logs/shifts_absences' not-null FK), so it wouldn't error, but
  // deleting it first avoids the same hazard in spirit - a window where
  // orphaned memberships_id=null junction rows sit around until
  // create_fake_categories() purges the table anyway.
  await purgeAll("memberships_shifts_categories");
}

async function create_memberships() {
  const directus = await useDirectusAdmin();

  console.info("Creating memberships 1");

  // Clean up old data
  // might error because of not_null constraint in assignment relation
  await purgeAll("memberships_memberships_coshoppers");
  await purgeAll("memberships_coshoppers");
  await purgeAll("memberships");

  console.info("Creating memberships 2");

  // Create some memberships
  const mships = [
    ["Alice", "applied"],
    ["Bob", "approved"],
    ["Charlie", "approved"],
    ["Dave", "in-cancellation"],
    ["User", "approved"],
    ["Editor", "approved"],
    ["Admin", "approved"],
  ];

  for (const mship of mships) {
    console.info("Creating memberships 3", mship);
    // Get user id
    const user_id = (
      await directus.request(readUsers({ filter: { first_name: mship[0]! } as any }))
    )[0]!.id;

    console.info("Creating memberships 4");

    // Create membership
    const membership = await directus.request(
      createItem("memberships", {
        memberships_user: user_id as any,
        memberships_type: "Aktiv",
        memberships_status: mship[1]!,
        shifts_user_type: "regular",
      }),
    );

    // Add a coshopper for "User Example"
    if (mship[0] === "User") {
      const coshopper = await directus.request(
        createItem("memberships_coshoppers", {
          first_name: "Co",
          last_name: "Shopper",
          email: "coshopper@example.com",
        }),
      );
      await directus.request(
        createItem("memberships_memberships_coshoppers", {
          memberships_id: membership.id,
          memberships_coshoppers_id: coshopper.id,
        }),
      );
    }
  }

  console.info("Creating memberships 5");
}

interface FakePlan {
  statusByIdx: string[];
  typeByIdx: string[];
  userTypeByIdx: string[];
  activeIdx: number[];
  regularIdx: number[];
  oneTimeIdx: number[];
  coordinatorIdx: number[];
  cheeseIdx: number[];
  holidayIdx: number[];
  coshopperIdx: number[];
  shiftsCounterByIdx: number[];
  categoryAllowedByIdx: Map<number, number[]>; // idx -> old category ids
}

// Decides, per fake membership index, its status/type/shifts_user_type, who
// actually holds a regular assignment, who gets one or two one-time
// bookings, who gets a skill, who is on holiday, and which shift categories
// each is allowed into. Computed once so create_fake_memberships and
// create_fake_shift_data agree on the same plan.
function buildFakePlan(n: number): FakePlan {
  const statusByIdx: string[] = [];
  const typeByIdx: string[] = [];
  const userTypeByIdx: string[] = [];

  const statusItems = MEMBERSHIP_STATUS_WEIGHTS.map((w) => ({ weight: w.weight, value: w }));
  const userTypeItems = USER_TYPE_WEIGHTS.map((w) => ({ weight: w.weight, value: w.userType }));

  for (let i = 0; i < n; i++) {
    const draw = pickWeighted(statusItems);
    statusByIdx.push(draw.status);
    typeByIdx.push(draw.type);
    userTypeByIdx.push(pickWeighted(userTypeItems));
  }

  const allIdx = Array.from({ length: n }, (_, i) => i);
  const activeIdx = allIdx.filter((i) => isActive(statusByIdx[i]!, typeByIdx[i]!));

  const regularCandidates = activeIdx.filter((i) => userTypeByIdx[i] === "regular");
  const regularIdx = pickN(regularCandidates, Math.min(REGULAR_ASSIGNEE_TARGET, regularCandidates.length));
  const regularSet = new Set(regularIdx);

  const oneTimeFromRegular = pickN(regularIdx, Math.round(regularIdx.length * ONE_TIME_FROM_REGULAR_RATE));
  const nonRegularActive = activeIdx.filter((i) => !regularSet.has(i));
  const oneTimeFromRest = pickN(
    nonRegularActive,
    Math.max(0, ONE_TIME_TARGET_PEOPLE - oneTimeFromRegular.length),
  );
  const oneTimeIdx = [...oneTimeFromRegular, ...oneTimeFromRest];

  const coordinatorIdx = pickN(activeIdx, Math.round(activeIdx.length * COORDINATOR_RATE));
  const cheeseIdx = pickN(activeIdx, Math.round(activeIdx.length * CHEESE_RATE));
  const holidayIdx = pickN(activeIdx, Math.round(activeIdx.length * HOLIDAY_START_RATE));
  const coshopperIdx = pickN(allIdx, Math.round(n * COSHOPPER_RATE));
  const shiftsCounterByIdx = Array.from({ length: n }, () => pickShiftsCounter());

  const categoryAllowedByIdx = new Map<number, number[]>();
  for (const i of activeIdx) {
    const allowed: number[] = [];
    for (const cat of CATEGORY_DEFINITIONS) {
      if (cat.adoptionPercent > 0 && chance(cat.adoptionPercent / 100)) {
        allowed.push(cat.oldId);
      }
    }
    if (allowed.length > 0) categoryAllowedByIdx.set(i, allowed);
  }

  return {
    statusByIdx,
    typeByIdx,
    userTypeByIdx,
    activeIdx,
    regularIdx,
    oneTimeIdx,
    coordinatorIdx,
    cheeseIdx,
    holidayIdx,
    coshopperIdx,
    shiftsCounterByIdx,
    categoryAllowedByIdx,
  };
}

interface FakeMembership {
  membershipId: number;
  userId: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Must run after create_shifts() (which assigns every membership that
// exists at that point a regular shift) so the fake memberships created
// here aren't swept up by that blind logic - their shift assignments are
// handled deliberately in create_fake_shift_data.
async function create_fake_memberships(
  fakeUsers: FakeUser[],
  plan: FakePlan,
): Promise<FakeMembership[]> {
  const directus = await useDirectusAdmin();
  console.info("Creating fake memberships");

  const payload = fakeUsers.map((user, idx) => ({
    memberships_user: user.id,
    memberships_type: plan.typeByIdx[idx],
    memberships_status: plan.statusByIdx[idx],
    shifts_user_type: plan.userTypeByIdx[idx],
    shifts_counter: plan.shiftsCounterByIdx[idx],
  }));

  const createdMemberships = await inChunks(payload, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("memberships", chunk as any)) as Promise<any[]>,
  );

  return fakeUsers.map((user, idx) => ({
    membershipId: createdMemberships[idx].id,
    userId: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  }));
}

// loosely: memberships_coshoppers.total - a second shopper attached to a
// membership, reusing the same Vienna identity pool as members themselves.
async function create_fake_coshoppers(fakeMemberships: FakeMembership[], plan: FakePlan) {
  const directus = await useDirectusAdmin();
  console.info("Creating fake coshoppers");

  const identities = generateIdentities(plan.coshopperIdx.length);
  // assignUniqueEmails only guarantees uniqueness within this call, not
  // against the member emails generated separately in create_fake_users -
  // without the prefix, a coshopper could be issued the same address as an
  // unrelated directus_users row (e.g. lukas.gruber@example.com twice).
  const emails = assignUniqueEmails(identities).map((email) => `co.${email}`);

  const payload = plan.coshopperIdx.map((idx, i) => ({
    membershipId: fakeMemberships[idx]!.membershipId,
    first_name: identities[i]![0],
    last_name: identities[i]![1],
    email: emails[i],
  }));

  const createdCoshoppers = await inChunks(payload, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(
      createItems(
        "memberships_coshoppers",
        chunk.map((c) => ({ first_name: c.first_name, last_name: c.last_name, email: c.email })),
      ),
    ) as Promise<any[]>,
  );

  const junctionPayload = payload.map((p, i) => ({
    memberships_id: p.membershipId,
    memberships_coshoppers_id: createdCoshoppers[i].id,
  }));
  await inChunks(junctionPayload, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(
      createItems("memberships_memberships_coshoppers", chunk as any),
    ) as Promise<any[]>,
  );
}

async function create_settings() {
  const directus = await useDirectusAdmin();
  console.info("Creating settings");

  // loosely: settings.shift_holiday_min_days / settings.shift_point_system
  await directus.request(
    updateSingleton("settings_hidden", {
      shift_holiday_min_days: 14,
      shift_point_system: true,
    }),
  );
}

interface CategoryMap {
  oldToNewId: Map<number, number>;
}

async function create_fake_categories(): Promise<CategoryMap> {
  const directus = await useDirectusAdmin();
  console.info("Creating shift categories");

  // The junction (memberships_shifts_categories) is already empty at this
  // point - purge_assignments() clears it early, before anything gets a
  // chance to repopulate it - so shifts_categories can be deleted directly.
  await purgeAll("shifts_categories");

  const payload = CATEGORY_DEFINITIONS.map((c) => ({
    name: c.name,
    beschreibung: c.beschreibung,
    for_all: c.for_all,
  }));
  const created = await directus.request(createItems("shifts_categories", payload as any));

  const oldToNewId = new Map<number, number>();
  CATEGORY_DEFINITIONS.forEach((c, i) => {
    oldToNewId.set(c.oldId, (created[i] as any).id);
  });

  return { oldToNewId };
}

async function create_shifts(categoryMap: CategoryMap) {
  console.log("Creating shifts");
  console.log("  claning shifts...");
  await cleanShiftsData();
  console.log("  creating shifts...");
  await createShifts(categoryMap);
  console.log("  creating assignments...");
  await createAssignments();
}

async function cleanShiftsData() {
  // Children (FK to shifts_shifts) first, shifts_shifts itself last -
  // purge_assignments() already clears these earlier in the run, but this
  // function should be safe to call on its own too.
  const schemas = [
    "shifts_assignments",
    "shifts_absences",
    "shifts_logs",
    "shifts_shifts",
  ];

  for (const schema of schemas) {
    console.log(`    purging schema ${schema} ...`);
    await purgeAll(schema);
  }
}

// Generates the real mix of shift shapes seen in production: currently
// active/ongoing recurring shifts (the bulk of what the shift-assignment
// system actually operates on), regular shifts that already ended, and
// one-time shift definitions - using the real archetype/category/status
// distributions rather than a single fixed pattern.
async function createShifts(categoryMap: CategoryMap) {
  const directus = await useDirectusAdmin();
  const now = getCurrentDate();
  const shiftsRequests: any[] = [];

  function resolveCategory(oldId: number | null): number | null {
    if (oldId === null) return null;
    return categoryMap.oldToNewId.get(oldId) ?? null;
  }

  function fromArchetype(archetype: ShiftArchetype) {
    // Keep the archetype's own category by default (it's already coupled to
    // this archetype's slots/time/points), only nulling it out at the
    // calibrated uncategorized rate.
    const categoryOldId = chance(SHIFT_UNCATEGORIZED_RATE) ? null : archetype.categoryOldId;
    return {
      shifts_slots: archetype.slots,
      shifts_from_time: archetype.fromTime,
      shifts_to_time: archetype.toTime,
      shifts_repeats_every: archetype.repeatsEvery,
      shifts_category_2: resolveCategory(categoryOldId),
      shift_points: archetype.points,
      shifts_allow_self_assignment: archetype.allowSelfAssignment,
      exclude_public_holidays: archetype.excludeHolidays,
      shifts_is_all_day: archetype.isAllDay,
    };
  }

  function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // Active, ongoing recurring shifts of category "Normal": copied exactly
  // from production (name + slots), not sampled - only the start date is
  // computed, anchored to a Monday 4 weeks ago (always in the past) plus
  // the shift's own weekType/weekday offset.
  const cycleAnchor = DateTime.now().minus({ weeks: 4 }).startOf("week");
  const normalCategoryNewId = resolveCategory(NORMAL_CATEGORY_OLD_ID);
  for (const def of NORMAL_CATEGORY_SHIFTS) {
    const { weekType, weekday } = parseNormalShiftName(def.name);
    const date = cycleAnchor.plus({
      weeks: WEEK_TYPE_OFFSET[weekType],
      days: WEEKDAY_OFFSET[weekday],
    });
    shiftsRequests.push({
      shifts_name: def.name,
      // Luxon's own toISODate() reads the local wall-clock date directly,
      // unlike toDirectusDate(date.toJSDate()) which would convert through
      // UTC and roll back a day at any positive UTC offset.
      shifts_from: date.toISODate(),
      shifts_to: null,
      shifts_is_regular: true,
      shifts_status: "published",
      shifts_slots: def.slots,
      shifts_from_time: def.fromTime,
      shifts_to_time: def.toTime,
      shifts_repeats_every: 28,
      shifts_category_2: normalCategoryNewId,
      shift_points: 28,
      shifts_allow_self_assignment: true,
      exclude_public_holidays: true,
      shifts_is_all_day: false,
    });
  }

  // Remaining active, ongoing recurring shifts (other categories), sampled
  // from real archetypes - "Normal" is excluded here since it's handled
  // exactly above.
  const nonNormalArchetypeItems = SHIFT_ARCHETYPES.filter(
    (a) => a.categoryOldId !== NORMAL_CATEGORY_OLD_ID,
  ).map((a) => ({ weight: a.weight, value: a }));
  const remainingActiveOngoing = Math.max(
    0,
    SHIFT_SHAPE_TARGETS.activeRecurringOngoing - NORMAL_CATEGORY_SHIFTS.length,
  );
  for (let i = 0; i < remainingActiveOngoing; i++) {
    const archetype = pickWeighted(nonNormalArchetypeItems);
    shiftsRequests.push({
      shifts_name: `Regular-${i + 1}`,
      shifts_from: toDirectusDate(addDays(now, -randomInt(0, 27))),
      shifts_to: null,
      shifts_is_regular: true,
      shifts_status: "published",
      ...fromArchetype(archetype),
    });
  }

  // Regular shifts that have already ended.
  for (let i = 0; i < SHIFT_SHAPE_TARGETS.regularWithPastEndDate; i++) {
    const archetype = pickArchetype();
    const from = addDays(now, -randomInt(180, 730));
    const to = addDays(from, randomInt(30, 300));
    const cappedTo = to.getTime() > now.getTime() ? addDays(now, -1) : to;
    shiftsRequests.push({
      shifts_name: `Ended-${i + 1}`,
      shifts_from: toDirectusDate(from),
      shifts_to: toDirectusDate(cappedTo),
      shifts_is_regular: true,
      shifts_status: pickShiftStatus(),
      ...fromArchetype(archetype),
    });
  }

  // One-time shift definitions (a single occurrence, not a recurring shift).
  for (let i = 0; i < SHIFT_SHAPE_TARGETS.oneTimeDefinitions; i++) {
    const archetype = pickArchetype();
    shiftsRequests.push({
      shifts_name: `OneTime-${i + 1}`,
      shifts_from: toDirectusDate(addDays(now, randomInt(-180, 60))),
      shifts_to: null,
      shifts_is_regular: false,
      shifts_status: pickShiftStatus(),
      ...fromArchetype(archetype),
    });
  }

  await inChunks(shiftsRequests, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("shifts_shifts", chunk)) as Promise<any[]>,
  );
}

async function createAssignments() {
  const directus = await useDirectusAdmin();

  const shifts = await directus.request(
    readItems("shifts_shifts", {
      fields: ["id"],
      filter: { shifts_is_regular: { _eq: true }, shifts_to: { _null: true } } as any,
      limit: -1,
    }),
  );

  const mships = await directus.request(
    readItems("memberships", {
      fields: ["id"],
      limit: -1,
    }),
  );

  const shuffledShifts = shuffled(shifts);
  const assignments = [];

  for (const mship of mships) {
    const shift = shuffledShifts.pop();

    if (!shift) {
      break;
    }

    assignments.push({
      shifts_from: toDirectusDate(new Date()),
      shifts_shift: shift.id,
      shifts_membership: mship.id,
      shifts_is_regular: true,
    });
  }

  await directus.request(createItems("shifts_assignments", assignments));
}

async function create_skills(): Promise<{
  coordinatorSkillId: number;
  cheeseSkillId: number;
}> {
  const directus = await useDirectusAdmin();
  console.info("Creating skills");

  await purgeAll("memberships_shifts_skills");
  await purgeAll("shifts_skills");

  const coordinatorSkill = await directus.request(
    createItem("shifts_skills", {
      name_de: "Schichtkoordination",
      name_en: "Shift coordinator",
      icon: "⭐",
    }),
  );

  const cheeseSkill = await directus.request(
    createItem("shifts_skills", {
      name_de: "Käse schneiden",
      name_en: "Cheese cutting",
      icon: "🧀",
    }),
  );

  const mships = await directus.request(
    readItems("memberships", {
      fields: ["id", { memberships_user: ["username"] }] as any,
      filter: {
        memberships_user: { username: { _in: ["Alice", "Bob", "Charlie"] } },
      },
    }),
  );

  for (const mship of mships as any[]) {
    const username = mship.memberships_user.username;
    if (username === "Alice" || username === "Bob") {
      await directus.request(
        createItem("memberships_shifts_skills", {
          memberships_id: mship.id,
          shifts_skills_id: coordinatorSkill.id,
        }),
      );
    }
    if (username === "Alice" || username === "Charlie") {
      await directus.request(
        createItem("memberships_shifts_skills", {
          memberships_id: mship.id,
          shifts_skills_id: cheeseSkill.id,
        }),
      );
    }
  }

  return {
    coordinatorSkillId: coordinatorSkill.id,
    cheeseSkillId: cheeseSkill.id,
  };
}

// ============================================================================
// FAKE MEMBERSHIP SHIFT DATA
// ============================================================================

const ONE_TIME_HORIZON_DAYS = 90;
const ONE_TIME_OCCURRENCES_PER_SHIFT = 3;

async function create_fake_shift_data(
  fakeMemberships: FakeMembership[],
  plan: FakePlan,
  skills: { coordinatorSkillId: number; cheeseSkillId: number },
  categoryMap: CategoryMap,
) {
  const directus = await useDirectusAdmin();
  console.info("Creating fake shift data");

  const allShifts = (await directus.request(
    readItems("shifts_shifts", {
      limit: -1,
      fields: [
        "id",
        "shifts_from",
        "shifts_to",
        "shifts_is_regular",
        "shifts_repeats_every",
        "shifts_slots",
        "exclude_public_holidays",
        "shift_points",
      ] as any,
    }),
  )) as unknown as (ShiftsShift & { shift_points?: number })[];
  // Only currently-active recurring shifts (no end date) are eligible for
  // new regular/one-time assignments - ended or one-time-definition shifts
  // aren't valid targets for a fresh booking.
  const bookableShifts = allShifts.filter((s) => s.shifts_is_regular && !s.shifts_to);

  const existingRegularAssignments = await directus.request(
    readItems("shifts_assignments", {
      limit: -1,
      filter: { shifts_is_regular: { _eq: true } } as any,
      fields: ["shifts_shift"],
    }),
  );

  const regularCounts = new Map<number, number>();
  for (const a of existingRegularAssignments as any[]) {
    const shiftId = a.shifts_shift as number;
    regularCounts.set(shiftId, (regularCounts.get(shiftId) ?? 0) + 1);
  }

  const now = getCurrentDate();
  const horizon = new Date(
    now.getTime() + ONE_TIME_HORIZON_DAYS * 24 * 60 * 60 * 1000,
  );

  // --- Regular assignments for the fake "regular" group ---
  // Ticket pool: each shift appears once per still-free slot, so drawing
  // without replacement can never exceed shifts_slots. If plan.regularIdx is
  // ever larger than the pool (more assignees than free slots), the excess
  // is simply left unassigned rather than wrapped around (which would
  // overbook a shift past its slot count) or, on an empty pool, crashing.
  const regularSlotPool: typeof bookableShifts = [];
  for (const shift of bookableShifts) {
    const free = shift.shifts_slots - (regularCounts.get(shift.id) ?? 0);
    for (let i = 0; i < free; i++) regularSlotPool.push(shift);
  }
  const shuffledRegularPool = shuffled(regularSlotPool);
  const assignedRegularIdx = plan.regularIdx.slice(0, shuffledRegularPool.length);
  if (assignedRegularIdx.length < plan.regularIdx.length) {
    console.warn(
      `Only ${shuffledRegularPool.length} free regular slots for ${plan.regularIdx.length} planned regular assignees - ${plan.regularIdx.length - assignedRegularIdx.length} left unassigned.`,
    );
  }

  const regularPayloads = assignedRegularIdx.map((idx, k) => {
    const shift = shuffledRegularPool[k]!;
    regularCounts.set(shift.id, (regularCounts.get(shift.id) ?? 0) + 1);
    return {
      shifts_membership: fakeMemberships[idx]!.membershipId,
      shifts_shift: shift.id,
      shifts_from: toDirectusDate(new Date()),
      shifts_is_regular: true,
    };
  });

  const createdRegular = await inChunks(regularPayloads, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("shifts_assignments", chunk as any)) as Promise<any[]>,
  );

  const regularAssignmentByIdx = new Map<
    number,
    { assignmentId: number; shiftId: number }
  >();
  assignedRegularIdx.forEach((idx, k) => {
    regularAssignmentByIdx.set(idx, {
      assignmentId: createdRegular[k].id,
      shiftId: regularPayloads[k]!.shifts_shift,
    });
  });

  // --- One-time assignments (1-2 future occurrences per user) ---
  // Regular assignees (existing + the ones just created above) consume
  // capacity on every future occurrence, so subtract them first; the
  // remaining per-occurrence capacity becomes the one-time ticket pool.
  const oneTimePool: { shift: (typeof bookableShifts)[number]; date: Date }[] = [];
  for (const shift of bookableShifts) {
    const cap = shift.shifts_slots - (regularCounts.get(shift.id) ?? 0);
    if (cap <= 0) continue;
    const rrule = getShiftRrule(shift);
    const dates = rrule
      .between(now, horizon, true)
      .filter((d: Date) => d.getTime() >= now.getTime())
      .slice(0, ONE_TIME_OCCURRENCES_PER_SHIFT);
    for (const date of dates) {
      for (let i = 0; i < cap; i++) oneTimePool.push({ shift, date });
    }
  }
  const shuffledOneTimePool = shuffled(oneTimePool);

  const oneTimeTickets: { idx: number; shift: (typeof bookableShifts)[number]; date: Date }[] = [];
  // A mutable copy, shrunk as tickets are handed out - a candidate rejected
  // for one person (already holds that shift) is left in place for the next
  // person to consider, instead of being permanently discarded.
  const remainingOneTimePool = [...shuffledOneTimePool];
  for (const idx of plan.oneTimeIdx) {
    const wantCount = rng() < 0.5 ? 1 : 2;
    const usedShiftIds = new Set<number>();
    let assignedCount = 0;
    let i = 0;
    while (assignedCount < wantCount && i < remainingOneTimePool.length) {
      const candidate = remainingOneTimePool[i]!;
      // Never double-book the same person on the same shift.
      if (usedShiftIds.has(candidate.shift.id)) {
        i++;
        continue;
      }
      usedShiftIds.add(candidate.shift.id);
      oneTimeTickets.push({
        idx,
        shift: candidate.shift,
        date: candidate.date,
      });
      remainingOneTimePool.splice(i, 1);
      assignedCount++;
    }
  }

  const oneTimePayloads = oneTimeTickets.map((t) => ({
    shifts_membership: fakeMemberships[t.idx]!.membershipId,
    shifts_shift: t.shift.id,
    shifts_from: toDirectusDate(t.date),
    shifts_to: toDirectusDate(t.date),
    shifts_is_regular: false,
  }));

  const createdOneTime = await inChunks(oneTimePayloads, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("shifts_assignments", chunk as any)) as Promise<any[]>,
  );

  const oneTimeByIdx = new Map<
    number,
    { assignmentId: number; date: string }[]
  >();
  oneTimeTickets.forEach((t, k) => {
    const list = oneTimeByIdx.get(t.idx) ?? [];
    list.push({
      assignmentId: createdOneTime[k].id,
      date: oneTimePayloads[k]!.shifts_from,
    });
    oneTimeByIdx.set(t.idx, list);
  });

  // --- Skills: coordinator and cheese-cutting ---
  const skillPayloads: { memberships_id: number; shifts_skills_id: number }[] = [];
  for (const idx of plan.coordinatorIdx) {
    skillPayloads.push({
      memberships_id: fakeMemberships[idx]!.membershipId,
      shifts_skills_id: skills.coordinatorSkillId,
    });
  }
  for (const idx of plan.cheeseIdx) {
    skillPayloads.push({
      memberships_id: fakeMemberships[idx]!.membershipId,
      shifts_skills_id: skills.cheeseSkillId,
    });
  }
  await inChunks(skillPayloads, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("memberships_shifts_skills", chunk as any)) as Promise<any[]>,
  );

  // --- Shift categories allowed per membership ---
  const categoryAllowedPayloads: { memberships_id: number; shifts_categories_id: number }[] = [];
  for (const [idx, oldCategoryIds] of plan.categoryAllowedByIdx) {
    for (const oldId of oldCategoryIds) {
      const newId = categoryMap.oldToNewId.get(oldId);
      if (newId == null) continue;
      categoryAllowedPayloads.push({
        memberships_id: fakeMemberships[idx]!.membershipId,
        shifts_categories_id: newId,
      });
    }
  }
  await inChunks(categoryAllowedPayloads, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("memberships_shifts_categories" as any, chunk as any)) as Promise<any[]>,
  );

  // --- Holidays, starting anywhere within HOLIDAY_SPAN_DAYS of today (past
  // or future), real duration distribution - see the HOLIDAY_LOOKBACK_DAYS
  // comment above for why the span isn't future-only. ---
  const holidayPayloads = plan.holidayIdx.map((idx) => {
    const startOffset = randomInt(-HOLIDAY_LOOKBACK_DAYS, HOLIDAY_WINDOW_DAYS);
    const duration = pickHolidayDurationDays();
    const start = new Date(now.getTime() + startOffset * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
    return {
      shifts_membership: fakeMemberships[idx]!.membershipId,
      shifts_from: toDirectusDate(start),
      shifts_to: toDirectusDate(end),
      shifts_is_holiday: true,
      shifts_is_for_all_assignments: true,
    };
  });
  await inChunks(holidayPayloads, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("shifts_absences", chunk as any)) as Promise<any[]>,
  );

  // --- Regular shift occurrences one-time unsubscribed ---
  const unsubscribePayloads: object[] = [];
  for (const idx of regularAssignmentByIdx.keys()) {
    if (!chance(REGULAR_UNSUBSCRIBE_CHANCE)) continue;
    const info = regularAssignmentByIdx.get(idx)!;
    const shift = allShifts.find((s) => s.id === info.shiftId);
    if (!shift) continue;
    const dates = getShiftRrule(shift).between(now, horizon, true);
    if (dates.length === 0) continue;
    const skipCount = randomInt(1, 4);
    const chosenDates = pickN(dates, Math.min(skipCount, dates.length));
    for (const date of chosenDates) {
      unsubscribePayloads.push({
        shifts_membership: fakeMemberships[idx]!.membershipId,
        shifts_assignment: info.assignmentId,
        shifts_from: toDirectusDate(date),
        shifts_to: toDirectusDate(date),
        shifts_is_holiday: false,
        shifts_is_for_all_assignments: false,
      });
    }
  }
  await inChunks(unsubscribePayloads, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("shifts_absences", chunk as any)) as Promise<any[]>,
  );

  // --- One-time registrations canceled by the user ---
  const cancelPayloads: object[] = [];
  for (const [idx, list] of oneTimeByIdx) {
    for (const item of list) {
      if (!chance(ONE_TIME_CANCEL_RATE)) continue;
      cancelPayloads.push({
        shifts_membership: fakeMemberships[idx]!.membershipId,
        shifts_assignment: item.assignmentId,
        shifts_from: item.date,
        shifts_to: item.date,
        shifts_is_holiday: false,
        shifts_is_for_all_assignments: false,
      });
    }
  }
  await inChunks(cancelPayloads, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("shifts_absences", chunk as any)) as Promise<any[]>,
  );

  // --- Attendance history (shifts_logs) for regular assignees ---
  // Recent history only (last few months, one entry per real occurrence of
  // their shift's recurrence cycle), matching the real attended/missed/other
  // type mix and using the shift's own point value as the log score.
  const logTypeItems = SHIFT_LOG_TYPE_WEIGHTS.map((t) => ({ weight: t.weight, value: t.type }));
  const logPayloads: object[] = [];
  const historyStart = new Date(now.getTime() - SHIFT_LOG_HISTORY_MONTHS * 30 * 24 * 60 * 60 * 1000);

  for (const [idx, info] of regularAssignmentByIdx) {
    const shift = allShifts.find((s) => s.id === info.shiftId);
    if (!shift) continue;
    const cycleDays = shift.shifts_repeats_every ?? 28;
    const points = shift.shift_points ?? 28;
    for (
      let occurrence = new Date(now.getTime() - cycleDays * 24 * 60 * 60 * 1000);
      occurrence.getTime() >= historyStart.getTime();
      occurrence = new Date(occurrence.getTime() - cycleDays * 24 * 60 * 60 * 1000)
    ) {
      const type = pickWeighted(logTypeItems);
      const score = type === "attended" || type === "attended_draft" ? points : 0;
      logPayloads.push({
        shifts_membership: fakeMemberships[idx]!.membershipId,
        shifts_shift: shift.id,
        shifts_type: type,
        shifts_date: toDirectusDate(occurrence),
        shifts_score: score,
      });
    }
  }
  await inChunks(logPayloads, BULK_CHUNK_SIZE, (chunk) =>
    directus.request(createItems("shifts_logs", chunk as any)) as Promise<any[]>,
  );

  // The "Log Create -> Score" Directus flow (directus-config/collections/flows.json,
  // triggered on shifts_logs items.create) adds each new log's shifts_score
  // to memberships.shifts_counter - so the calibrated value written in
  // create_fake_memberships just got clobbered for every regular assignee
  // above. Reassert the intended value now that the logs - and whatever
  // the flow did with them - already exist.
  //
  // shiftsCounterByIdx is drawn from a handful of fixed buckets, so despite
  // there being one membership per index there are only ~200 distinct
  // values across all of them - group by value and issue one
  // updateItems(ids, {shifts_counter}) call per group (sequentially, not
  // via inChunks' Promise.all).
  const membershipIdsByCounter = new Map<number, number[]>();
  fakeMemberships.forEach((m, idx) => {
    const counter = plan.shiftsCounterByIdx[idx]!;
    const ids = membershipIdsByCounter.get(counter) ?? [];
    ids.push(m.membershipId);
    membershipIdsByCounter.set(counter, ids);
  });
  for (const [counter, ids] of membershipIdsByCounter) {
    await directus.request(updateItems("memberships", ids, { shifts_counter: counter }));
  }
}
