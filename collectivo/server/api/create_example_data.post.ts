import {
  createItem,
  createItems,
  createUser,
  createUsers,
  deleteItems,
  readRoles,
  readUsers,
  readItems,
  updateUser,
} from "@directus/sdk";

import { DateTime } from "luxon";

export default defineEventHandler(async (_event) => {
  create_examples();
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
  return shuffled(arr).slice(0, n);
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ============================================================================
// VIENNA EXAMPLE USERS
// ============================================================================

// Roughly representative of Vienna's population mix: majority
// German/Austrian names, plus realistic shares of the city's largest
// migrant-background communities (ex-Yugoslavia, Turkey, Poland, Romania,
// Hungary, Middle East/Afghanistan, Czechia/Slovakia).
const VIENNA_USERS: [string, string][] = [
  // German / Austrian (~60)
  ["Lukas", "Gruber"],
  ["Sophie", "Huber"],
  ["Maximilian", "Bauer"],
  ["Anna", "Wagner"],
  ["Felix", "Pichler"],
  ["Laura", "Steiner"],
  ["Jakob", "Moser"],
  ["Emma", "Mayer"],
  ["David", "Berger"],
  ["Lena", "Fuchs"],
  ["Paul", "Winkler"],
  ["Marie", "Schmid"],
  ["Simon", "Wolf"],
  ["Julia", "Eder"],
  ["Tobias", "Fischer"],
  ["Sarah", "Weber"],
  ["Florian", "Schneider"],
  ["Lisa", "Maier"],
  ["Daniel", "Hofer"],
  ["Nina", "Leitner"],
  ["Michael", "Wimmer"],
  ["Katharina", "Auer"],
  ["Sebastian", "Brunner"],
  ["Sabrina", "Binder"],
  ["Christoph", "Egger"],
  ["Vanessa", "Wallner"],
  ["Andreas", "Reiter"],
  ["Jasmin", "Aigner"],
  ["Thomas", "Baumgartner"],
  ["Melanie", "Lang"],
  ["Stefan", "Grabner"],
  ["Carina", "Hummel"],
  ["Markus", "Wieser"],
  ["Michaela", "Neumann"],
  ["Christian", "Schwarz"],
  ["Petra", "Riegler"],
  ["Martin", "Wurm"],
  ["Elisabeth", "Schuster"],
  ["Bernhard", "Haas"],
  ["Barbara", "Fellner"],
  ["Alexander", "Lechner"],
  ["Nicole", "Fuerst"],
  ["Patrick", "Zach"],
  ["Verena", "Holzer"],
  ["Manuel", "Kogler"],
  ["Theresa", "Perner"],
  ["Georg", "Standler"],
  ["Julia", "Kastner"],
  ["Philipp", "Aichinger"],
  ["Kathrin", "Schaller"],
  ["Matthias", "Preining"],
  ["Sandra", "Hutter"],
  ["Robert", "Kern"],
  ["Claudia", "Fink"],
  ["Wolfgang", "Sailer"],
  ["Andrea", "Wiesinger"],
  ["Peter", "Riedl"],
  ["Ursula", "Gansch"],
  ["Franz", "Steinbauer"],
  ["Gabriele", "Haider"],
  // Ex-Yugoslavia: Serbian / Bosnian / Croatian (~12)
  ["Marko", "Jovanović"],
  ["Ana", "Petrović"],
  ["Stefan", "Nikolić"],
  ["Jovana", "Marković"],
  ["Nikola", "Popović"],
  ["Milica", "Ilić"],
  ["Aleksandar", "Kovačević"],
  ["Ivana", "Horvat"],
  ["Goran", "Babić"],
  ["Snežana", "Đorđević"],
  ["Dejan", "Stanković"],
  ["Tijana", "Radić"],
  // Turkish (~8)
  ["Emre", "Yılmaz"],
  ["Elif", "Kaya"],
  ["Mustafa", "Demir"],
  ["Zeynep", "Şahin"],
  ["Burak", "Çelik"],
  ["Aylin", "Yıldız"],
  ["Hakan", "Aydın"],
  ["Merve", "Arslan"],
  // Polish (~6)
  ["Piotr", "Kowalski"],
  ["Katarzyna", "Nowak"],
  ["Tomasz", "Wiśniewski"],
  ["Agnieszka", "Wójcik"],
  ["Marcin", "Kamiński"],
  ["Magdalena", "Zielińska"],
  // Romanian (~4)
  ["Andrei", "Popescu"],
  ["Elena", "Ionescu"],
  ["Mihai", "Popa"],
  ["Ioana", "Dumitru"],
  // Hungarian (~3)
  ["Gábor", "Nagy"],
  ["Zsófia", "Kovács"],
  ["László", "Tóth"],
  // Middle East / Afghanistan (~4)
  ["Ahmad", "Ahmadi"],
  ["Layla", "Hussaini"],
  ["Omar", "Khalil"],
  ["Fatima", "Al-Sayed"],
  // Czech / Slovak (~3)
  ["Jan", "Novák"],
  ["Petra", "Svobodová"],
  ["Martin", "Dvořák"],
];

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

// ============================================================================
// FAKE USER SHIFT/SKILL/HOLIDAY PLAN
// ============================================================================

const N_REGULAR = 30;
const N_ONETIME = 50;
const N_ONETIME_FROM_REGULAR = 4;
const N_COORDINATOR = 5;
const N_CHEESE = 8;
const N_HOLIDAY = 5;
const N_UNSUBSCRIBE_OCCURRENCE = 4;
const N_CANCEL_ONETIME = 4;

interface FakePlan {
  regularIdx: number[];
  oneTimeIdx: number[];
  coordinatorIdx: number[];
  cheeseIdx: number[];
  holidayIdx: number[];
}

// Decides, per fake user index, who gets a regular shift, who gets one or
// two one-time registrations (with deliberate overlap so a few regular
// assignees also pick up a one-time shift), who gets a skill, and who is
// on holiday. Computed once so create_fake_memberships and
// create_fake_shift_data agree on the same assignment.
function buildFakePlan(n: number): FakePlan {
  const allIdx = Array.from({ length: n }, (_, i) => i);

  const regularIdx = pickN(allIdx, N_REGULAR);
  const regularSet = new Set(regularIdx);
  const nonRegularIdx = allIdx.filter((i) => !regularSet.has(i));

  const oneTimeFromRegular = pickN(regularIdx, N_ONETIME_FROM_REGULAR);
  const oneTimeFromRest = pickN(
    nonRegularIdx,
    N_ONETIME - N_ONETIME_FROM_REGULAR,
  );
  const oneTimeIdx = [...oneTimeFromRegular, ...oneTimeFromRest];

  const coordinatorIdx = pickN(allIdx, N_COORDINATOR);
  const cheeseIdx = pickN(allIdx, N_CHEESE);
  const holidayIdx = pickN(allIdx, N_HOLIDAY);

  return { regularIdx, oneTimeIdx, coordinatorIdx, cheeseIdx, holidayIdx };
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

async function create_examples() {
  console.info("Creating example data for collectivo");
  rng = makeRng(42);
  await create_users();
  const fakeUsers = await create_fake_users();
  const plan = buildFakePlan(fakeUsers.length);
  await purge_assignments();
  await create_memberships();
  await create_tags();
  await create_tiles();
  await create_emails();
  await create_shifts();
  const skills = await create_skills();
  const fakeMemberships = await create_fake_memberships(fakeUsers, plan);
  await create_fake_shift_data(fakeMemberships, plan, skills);
  console.log("Seed successful");
}

async function create_users() {
  const directus = await useDirectusAdmin();
  const userRole = await getRole("NutzerInnen");
  const editorRole = await getRole("Mitgliederverwaltung");
  const adminRole = await getRole("Administrator");

  // Create some users
  console.info("Creating users");

  const userNames = [
    "Admin",
    "Editor",
    "User",
    "Alice",
    "Bob",
    "Charlie",
    "Dave",
  ];

  const users = [];

  for (const userName of userNames) {
    const email = `${userName.toLowerCase()}@example.com`;

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
      memberships_street_number: "123",
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

function fakeUserEmail(first: string, last: string): string {
  return `${slugifyForEmail(first)}.${slugifyForEmail(last)}@example.com`;
}

async function create_fake_users(): Promise<FakeUser[]> {
  const directus = await useDirectusAdmin();
  const userRole = await getRole("NutzerInnen");

  console.info("Creating fake Vienna users");

  const emails = VIENNA_USERS.map(([first, last]) => fakeUserEmail(first, last));

  const existing = await directus.request(
    readUsers({
      filter: { email: { _in: emails } },
      fields: ["id", "email"],
      limit: -1,
    }),
  );

  const existingByEmail = new Map(
    existing.map((u) => [u.email as string, u.id as string]),
  );

  const toCreate = VIENNA_USERS.filter(
    ([first, last]) => !existingByEmail.has(fakeUserEmail(first, last)),
  ).map(([first, last]) => ({
    first_name: first,
    last_name: last,
    username: first,
    username_last: last,
    email: fakeUserEmail(first, last),
    password: slugifyForEmail(first),
    role: userRole,
    status: "active",
    memberships_street: "Example Street",
    memberships_city: "Example City",
    memberships_street_number: "123",
    memberships_postcode: "12345",
  }));

  let created: { id: string; email: string }[] = [];

  if (toCreate.length > 0) {
    created = (await directus.request(
      createUsers(toCreate, { fields: ["id", "email"] } as any),
    )) as any;
  }

  const createdByEmail = new Map(created.map((u) => [u.email, u.id]));

  return VIENNA_USERS.map(([first, last]) => {
    const email = fakeUserEmail(first, last);
    const id = existingByEmail.get(email) ?? createdByEmail.get(email)!;
    return { id, first_name: first, last_name: last, email };
  });
}

async function create_tags() {
  const directus = await useDirectusAdmin();

  // Create some tags
  console.info("Creating tags");

  await directus.request(deleteItems("collectivo_tags", { limit: 1000 }));
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
  await directus.request(deleteItems("messages_templates", { limit: 1000 }));
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
  await directus.request(deleteItems("collectivo_tiles", { limit: 1000 }));

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

async function purge_assignments() {
  const directus = await useDirectusAdmin();

  console.info("Purging shift assignments");

  await directus.request(deleteItems("shifts_assignments", { limit: 1000 }));
}

async function create_memberships() {
  const directus = await useDirectusAdmin();

  console.info("Creating memberships 1");

  // Clean up old data
  // might error because of not_null constraint in assignment relation
  await directus.request(
    deleteItems("memberships_memberships_coshoppers", { limit: 1000 }),
  );
  await directus.request(
    deleteItems("memberships_coshoppers", { limit: 1000 }),
  );
  await directus.request(deleteItems("memberships", { limit: 1000 }));

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

  const regularSet = new Set(plan.regularIdx);

  const payload = fakeUsers.map((user, idx) => ({
    memberships_user: user.id,
    memberships_type: "Aktiv",
    memberships_status: "approved",
    shifts_user_type: regularSet.has(idx) ? "regular" : "jumper",
  }));

  const createdMemberships = await directus.request(
    createItems("memberships", payload as any),
  );

  return fakeUsers.map((user, idx) => ({
    membershipId: (createdMemberships[idx] as any).id,
    userId: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  }));
}

async function create_shifts() {
  console.log("Creating shifts");
  console.log("  claning shifts...");
  await cleanShiftsData();
  console.log("  creating shifts...");
  await createShifts();
  console.log("  creating assignments...");
  await createAssignments();
  // await createLogs();
}

async function cleanShiftsData() {
  const directus = await useDirectusAdmin();

  const schemas = [
    "shifts_shifts",
    "shifts_assignments",
    "shifts_absences",
    "shifts_logs",
  ];

  for (const schema of schemas) {
    console.log(`    deleting 1000 items in schema ${schema} ...`);
    await directus.request(deleteItems(schema as any, { limit: 1000 }));
  }
}

const SHIFT_TIMES_OF_DAY = [8, 11, 14, 17];
const SHIFT_CYCLE_START = DateTime.now().minus({ weeks: 4 }).startOf("week");
const SHIFT_CYCLE_DURATION_WEEKS = 4;

async function createShifts() {
  const directus = await useDirectusAdmin();

  const monday = SHIFT_CYCLE_START;
  const shiftsRequests: any[] = [];

  const nb_weeks = SHIFT_CYCLE_DURATION_WEEKS;

  for (let week = 0; week < nb_weeks; week++) {
    for (let weekday = 0; weekday < 5; weekday++) {
      const day = monday.plus({ days: weekday, week: week });

      for (const time_of_day of SHIFT_TIMES_OF_DAY) {
        shiftsRequests.push({
          shifts_name:
            ["A", "B", "C", "D"][week]! +
            "-" +
            (day.weekdayShort ?? "") +
            "-" +
            time_of_day,
          shifts_from: day.set({ hour: time_of_day }).toString(),
          shifts_from_time: String(time_of_day) + ":00",
          shifts_to_time: String(time_of_day + 3) + ":00",
          shifts_is_regular: true,
          shifts_repeats_every: nb_weeks * 7,
          shifts_status: "published",
          shifts_slots: 2,
          shifts_allow_self_assignment: true,
        });
      }
    }
  }

  await directus.request(createItems("shifts_shifts", shiftsRequests));
}

async function createAssignments() {
  const directus = await useDirectusAdmin();

  const shifts = await directus.request(
    readItems("shifts_shifts", {
      fields: ["id"],
      limit: -1,
    }),
  );

  const mships = await directus.request(
    readItems("memberships", {
      fields: ["id"],
      limit: -1,
    }),
  );

  const assignments = [];

  for (const mship of mships) {
    const shift = shifts.pop();

    if (!shift) {
      break;
    }

    assignments.push({
      shifts_from: DateTime.now().toString(),
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

  await directus.request(
    deleteItems("memberships_shifts_skills", { limit: 1000 }),
  );
  await directus.request(deleteItems("shifts_skills", { limit: 1000 }));

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
// FAKE USER SHIFT DATA
// ============================================================================

const ONE_TIME_HORIZON_DAYS = 90;
const ONE_TIME_OCCURRENCES_PER_SHIFT = 3;

async function create_fake_shift_data(
  fakeMemberships: FakeMembership[],
  plan: FakePlan,
  skills: { coordinatorSkillId: number; cheeseSkillId: number },
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
      ],
    }),
  )) as unknown as ShiftsShift[];

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
  // without replacement can never exceed shifts_slots.
  const regularSlotPool: ShiftsShift[] = [];
  for (const shift of allShifts) {
    const free = shift.shifts_slots - (regularCounts.get(shift.id) ?? 0);
    for (let i = 0; i < free; i++) regularSlotPool.push(shift);
  }
  const shuffledRegularPool = shuffled(regularSlotPool);

  const regularPayloads = plan.regularIdx.map((idx, k) => {
    const shift = shuffledRegularPool[k]!;
    regularCounts.set(shift.id, (regularCounts.get(shift.id) ?? 0) + 1);
    return {
      shifts_membership: fakeMemberships[idx]!.membershipId,
      shifts_shift: shift.id,
      shifts_from: DateTime.now().toString(),
      shifts_is_regular: true,
    };
  });

  const createdRegular =
    regularPayloads.length > 0
      ? await directus.request(
          createItems("shifts_assignments", regularPayloads as any),
        )
      : [];

  const regularAssignmentByIdx = new Map<
    number,
    { assignmentId: number; shiftId: number }
  >();
  plan.regularIdx.forEach((idx, k) => {
    regularAssignmentByIdx.set(idx, {
      assignmentId: (createdRegular[k] as any).id,
      shiftId: regularPayloads[k]!.shifts_shift,
    });
  });

  // --- One-time assignments (1-2 future occurrences per user) ---
  // Regular assignees (existing + the ones just created above) consume
  // capacity on every future occurrence, so subtract them first; the
  // remaining per-occurrence capacity becomes the one-time ticket pool.
  const oneTimePool: { shift: ShiftsShift; date: Date }[] = [];
  for (const shift of allShifts) {
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

  const oneTimeTickets: { idx: number; shift: ShiftsShift; date: Date }[] = [];
  let poolPos = 0;
  for (const idx of plan.oneTimeIdx) {
    const wantCount = rng() < 0.5 ? 1 : 2;
    const usedShiftIds = new Set<number>();
    let assignedCount = 0;
    while (assignedCount < wantCount && poolPos < shuffledOneTimePool.length) {
      const candidate = shuffledOneTimePool[poolPos]!;
      poolPos++;
      // Never double-book the same person on the same shift.
      if (usedShiftIds.has(candidate.shift.id)) continue;
      usedShiftIds.add(candidate.shift.id);
      oneTimeTickets.push({
        idx,
        shift: candidate.shift,
        date: candidate.date,
      });
      assignedCount++;
    }
  }

  const oneTimePayloads = oneTimeTickets.map((t) => ({
    shifts_membership: fakeMemberships[t.idx]!.membershipId,
    shifts_shift: t.shift.id,
    shifts_from: t.date.toISOString(),
    shifts_to: t.date.toISOString(),
    shifts_is_regular: false,
  }));

  const createdOneTime =
    oneTimePayloads.length > 0
      ? await directus.request(
          createItems("shifts_assignments", oneTimePayloads as any),
        )
      : [];

  const oneTimeByIdx = new Map<
    number,
    { assignmentId: number; date: string }[]
  >();
  oneTimeTickets.forEach((t, k) => {
    const list = oneTimeByIdx.get(t.idx) ?? [];
    list.push({
      assignmentId: (createdOneTime[k] as any).id,
      date: oneTimePayloads[k]!.shifts_from,
    });
    oneTimeByIdx.set(t.idx, list);
  });

  // --- Skills: coordinator (5%) and cheese-cutting (8%) ---
  const skillPayloads: { memberships_id: number; shifts_skills_id: number }[] =
    [];
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
  if (skillPayloads.length > 0) {
    await directus.request(
      createItems("memberships_shifts_skills", skillPayloads as any),
    );
  }

  // --- Holidays (5%), within the next 3 months ---
  const holidayPayloads = plan.holidayIdx.map((idx) => {
    const startOffset = randomInt(0, 75);
    const duration = 14 + randomInt(0, 7);
    const start = new Date(now.getTime() + startOffset * 24 * 60 * 60 * 1000);
    const end = new Date(
      start.getTime() + (duration - 1) * 24 * 60 * 60 * 1000,
    );
    return {
      shifts_membership: fakeMemberships[idx]!.membershipId,
      shifts_from: start.toISOString(),
      shifts_to: end.toISOString(),
      shifts_is_holiday: true,
      shifts_is_for_all_assignments: true,
    };
  });
  if (holidayPayloads.length > 0) {
    await directus.request(
      createItems("shifts_absences", holidayPayloads as any),
    );
  }

  // --- A few regular shift occurrences one-time unsubscribed ---
  const unsubscribeIdx = pickN(
    [...regularAssignmentByIdx.keys()],
    Math.min(N_UNSUBSCRIBE_OCCURRENCE, regularAssignmentByIdx.size),
  );
  const unsubscribePayloads: object[] = [];
  for (const idx of unsubscribeIdx) {
    const info = regularAssignmentByIdx.get(idx)!;
    const shift = allShifts.find((s) => s.id === info.shiftId);
    if (!shift) continue;
    const dates = getShiftRrule(shift).between(now, horizon, true);
    if (dates.length === 0) continue;
    const date = dates[randomInt(0, dates.length - 1)]!;
    unsubscribePayloads.push({
      shifts_membership: fakeMemberships[idx]!.membershipId,
      shifts_assignment: info.assignmentId,
      shifts_from: date.toISOString(),
      shifts_to: date.toISOString(),
      shifts_is_holiday: false,
      shifts_is_for_all_assignments: false,
    });
  }
  if (unsubscribePayloads.length > 0) {
    await directus.request(
      createItems("shifts_absences", unsubscribePayloads as any),
    );
  }

  // --- A few one-time registrations canceled by the user ---
  const flatOneTime: { idx: number; assignmentId: number; date: string }[] =
    [];
  for (const [idx, list] of oneTimeByIdx) {
    for (const item of list) {
      flatOneTime.push({
        idx,
        assignmentId: item.assignmentId,
        date: item.date,
      });
    }
  }
  const cancelPicks = pickN(
    flatOneTime,
    Math.min(N_CANCEL_ONETIME, flatOneTime.length),
  );
  const cancelPayloads = cancelPicks.map((c) => ({
    shifts_membership: fakeMemberships[c.idx]!.membershipId,
    shifts_assignment: c.assignmentId,
    shifts_from: c.date,
    shifts_to: c.date,
    shifts_is_holiday: false,
    shifts_is_for_all_assignments: false,
  }));
  if (cancelPayloads.length > 0) {
    await directus.request(
      createItems("shifts_absences", cancelPayloads as any),
    );
  }
}
