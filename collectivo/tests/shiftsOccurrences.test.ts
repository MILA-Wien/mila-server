import { describe, it, expect, vi, beforeEach } from "vitest";
import { RRule, RRuleSet } from "rrule";

// ---------------------------------------------------------------------------
// Test helpers – tiny factories for the shapes returned by the db functions
// ---------------------------------------------------------------------------

function utc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function mockShift(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    shifts_name: "Morning Shift",
    shifts_from: "2025-03-01",
    shifts_to: "2025-04-01",
    shifts_is_regular: true,
    shifts_is_all_day: false,
    shifts_from_time: "08:00:00",
    shifts_to_time: "12:00:00",
    shifts_slots: 3,
    shifts_allow_self_assignment: true,
    shifts_repeats_every: 7,
    shifts_status: "published",
    shifts_description: "Test shift",
    shifts_location: "Store",
    shifts_category_2: 1,
    exclude_public_holidays: false,
    ...overrides,
  };
}

function mockAssignment(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    id: 100,
    shifts_from: "2025-03-01",
    shifts_to: "2025-04-01",
    shifts_shift: 1,
    shifts_is_regular: true,
    shifts_membership: {
      id: 10,
      shifts_can_be_coordinator: false,
      memberships_user: {
        username: "Alice",
        username_last: "Smith",
        hide_name: false,
        buddy_status: "keine_angabe",
        email: "alice@example.com",
        memberships_phone: "+4312345",
      },
      "count(shifts_logs)": 5,
    },
  };
  return { ...defaults, ...overrides };
}

// ---------------------------------------------------------------------------
// Stubs for auto-imported server utils
// ---------------------------------------------------------------------------

const stubs = {
  dbGetShifts: vi.fn(),
  dbGetAssignmentsForApi: vi.fn(),
  dbGetAbsences: vi.fn(),
  dbGetPublicHolidays: vi.fn(),
};

// We need the real RRule functions. Import them and expose as globals.
// The module under test relies on auto-imported `getShiftRrule`,
// `getAssignmentRrules`, and `parseUtcMidnight`.

vi.stubGlobal("dbGetShifts", stubs.dbGetShifts);
vi.stubGlobal("dbGetAssignmentsForApi", stubs.dbGetAssignmentsForApi);
vi.stubGlobal("dbGetAbsences", stubs.dbGetAbsences);
vi.stubGlobal("dbGetPublicHolidays", stubs.dbGetPublicHolidays);

// Expose real utility functions as globals (Nitro auto-imports them)
import { parseUtcMidnight } from "~/server/utils/dates";
import { getShiftRrule, getAssignmentRrules } from "~/server/utils/shiftsRrules";
vi.stubGlobal("parseUtcMidnight", parseUtcMidnight);
vi.stubGlobal("getShiftRrule", getShiftRrule);
vi.stubGlobal("getAssignmentRrules", getAssignmentRrules);

// Now import the function under test
import { getShiftOccurrencesForApi } from "~/server/utils/shiftsOccurrences";

// ---------------------------------------------------------------------------
// Default DB mock behaviour
// ---------------------------------------------------------------------------

function setupDefaultMocks(opts: {
  shifts?: any[];
  assignments?: any[];
  absences?: any[];
  publicHolidays?: any[];
} = {}) {
  stubs.dbGetShifts.mockResolvedValue(opts.shifts ?? []);
  stubs.dbGetAssignmentsForApi.mockResolvedValue(opts.assignments ?? []);
  stubs.dbGetAbsences.mockResolvedValue(opts.absences ?? []);
  stubs.dbGetPublicHolidays.mockResolvedValue(opts.publicHolidays ?? []);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getShiftOccurrencesForApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Basic response structure ----

  it("returns { occurrences, publicHolidays } arrays", async () => {
    setupDefaultMocks();
    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"));
    expect(result).toHaveProperty("occurrences");
    expect(result).toHaveProperty("publicHolidays");
    expect(Array.isArray(result.occurrences)).toBe(true);
    expect(Array.isArray(result.publicHolidays)).toBe(true);
  });

  it("returns empty arrays when no shifts exist", async () => {
    setupDefaultMocks();
    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"));
    expect(result.occurrences).toHaveLength(0);
    expect(result.publicHolidays).toHaveLength(0);
  });

  // ---- Occurrence generation ----

  it("generates correct occurrences for a weekly recurring shift", async () => {
    const shift = mockShift();
    setupDefaultMocks({ shifts: [shift] });

    const from = utc("2025-03-01");
    const to = utc("2025-03-31");
    const result = await getShiftOccurrencesForApi(from, to);

    // Weekly from Mar 1 to Mar 31: Mar 1, 8, 15, 22, 29 = 5
    expect(result.occurrences.length).toBeGreaterThanOrEqual(4);
    expect(result.occurrences.length).toBeLessThanOrEqual(5);
  });

  it("sorts occurrences by start date", async () => {
    const shift1 = mockShift({ id: 1, shifts_from: "2025-03-10", shifts_is_regular: false, shifts_from_time: "14:00:00" });
    const shift2 = mockShift({ id: 2, shifts_from: "2025-03-05", shifts_is_regular: false, shifts_from_time: "08:00:00" });
    setupDefaultMocks({ shifts: [shift1, shift2] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"));
    expect(result.occurrences.length).toBe(2);

    const starts = result.occurrences.map((o) => new Date(o.start).getTime());
    expect(starts[0]).toBeLessThan(starts[1]);
  });

  // ---- Flat assignment structure ----

  it("returns flat assignment structure with top-level fields", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({ shifts_shift: 1, shifts_from: "2025-03-15", shifts_is_regular: false });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), true);
    expect(result.occurrences.length).toBe(1);

    const a = result.occurrences[0].assignments[0];
    // Flat fields at top level
    expect(a).toHaveProperty("assignmentId", 100);
    expect(a).toHaveProperty("membershipId", 10);
    expect(a).toHaveProperty("username", "Alice");
    expect(a).toHaveProperty("username_last", "Smith");
    expect(a).toHaveProperty("hide_name", false);
    expect(a).toHaveProperty("buddy_status", "keine_angabe");
    expect(a).toHaveProperty("shifts_can_be_coordinator", false);
    expect(a).toHaveProperty("isActive", true);
    expect(a).toHaveProperty("isOneTime", true);
    expect(a).toHaveProperty("isSelf", false);
    expect(a).toHaveProperty("absences");

    // No nested directus structure
    expect(a).not.toHaveProperty("shifts_membership");
  });

  // ---- Non-admin behaviour ----

  it("non-admin: adminData is null on all assignments", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({ shifts_shift: 1, shifts_from: "2025-03-15", shifts_is_regular: false });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false);
    for (const occ of result.occurrences) {
      for (const a of occ.assignments) {
        expect(a.adminData).toBeNull();
      }
    }
  });

  it("non-admin: no email or phone anywhere in response", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({ shifts_shift: 1, shifts_from: "2025-03-15", shifts_is_regular: false });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false);
    const json = JSON.stringify(result);
    expect(json).not.toContain("alice@example.com");
    expect(json).not.toContain("+4312345");
  });

  it("non-admin: buddy_status IS present (needed for filter)", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({
      shifts_shift: 1,
      shifts_from: "2025-03-15",
      shifts_is_regular: false,
      shifts_membership: {
        id: 10,
        shifts_can_be_coordinator: false,
        memberships_user: {
          username: "Bob",
          username_last: "Jones",
          hide_name: false,
          buddy_status: "is_buddy",
        },
      },
    });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false);
    expect(result.occurrences[0].assignments[0].buddy_status).toBe("is_buddy");
  });

  it("non-admin: username masked to '' when hide_name=true", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({
      shifts_shift: 1,
      shifts_from: "2025-03-15",
      shifts_is_regular: false,
      shifts_membership: {
        id: 10,
        shifts_can_be_coordinator: false,
        memberships_user: {
          username: "SecretUser",
          username_last: "Hidden",
          hide_name: true,
          buddy_status: "keine_angabe",
        },
      },
    });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false);
    const a = result.occurrences[0].assignments[0];
    expect(a.username).toBe("");
    expect(a.username_last).toBe("");
    expect(a.hide_name).toBe(true);
  });

  it("non-admin: names NOT masked when hide_name=false", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({ shifts_shift: 1, shifts_from: "2025-03-15", shifts_is_regular: false });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false);
    const a = result.occurrences[0].assignments[0];
    expect(a.username).toBe("Alice");
    expect(a.username_last).toBe("Smith");
  });

  // ---- Admin behaviour ----

  it("admin: names NOT masked even when hide_name=true", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({
      shifts_shift: 1,
      shifts_from: "2025-03-15",
      shifts_is_regular: false,
      shifts_membership: {
        id: 10,
        shifts_can_be_coordinator: false,
        memberships_user: {
          username: "SecretAdmin",
          username_last: "Visible",
          hide_name: true,
          buddy_status: "keine_angabe",
          email: "secret@admin.com",
          memberships_phone: "+431111",
        },
        "count(shifts_logs)": 2,
      },
    });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), true);
    const a = result.occurrences[0].assignments[0];
    expect(a.username).toBe("SecretAdmin");
    expect(a.username_last).toBe("Visible");
  });

  it("admin: adminData contains email, phone, and assignment count", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({
      shifts_shift: 1,
      shifts_from: "2025-03-15",
      shifts_is_regular: false,
      shifts_membership: {
        id: 10,
        shifts_can_be_coordinator: true,
        memberships_user: {
          username: "Admin",
          username_last: "User",
          hide_name: false,
          buddy_status: "keine_angabe",
          email: "admin@test.com",
          memberships_phone: "+431234567",
        },
        "count(shifts_logs)": 42,
      },
    });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), true);
    const a = result.occurrences[0].assignments[0];
    expect(a.adminData).not.toBeNull();
    expect(a.adminData!.email).toBe("admin@test.com");
    expect(a.adminData!.memberships_phone).toBe("+431234567");
    expect(a.adminData!.shifts_assignments_count).toBe(42);
  });

  // ---- selfAssigned ----

  it("selfAssigned=true when mship matches an active assignment", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({
      shifts_shift: 1,
      shifts_from: "2025-03-15",
      shifts_is_regular: false,
      shifts_membership: {
        id: 77,
        shifts_can_be_coordinator: false,
        memberships_user: {
          username: "Me",
          username_last: "Myself",
          hide_name: false,
          buddy_status: "keine_angabe",
        },
      },
    });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false, undefined, 77);
    expect(result.occurrences[0].selfAssigned).toBe(true);
    expect(result.occurrences[0].assignments[0].isSelf).toBe(true);
  });

  it("selfAssigned=false when mship does not match", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({
      shifts_shift: 1,
      shifts_from: "2025-03-15",
      shifts_is_regular: false,
    });
    setupDefaultMocks({ shifts: [shift], assignments: [assignment] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false, undefined, 999);
    expect(result.occurrences[0].selfAssigned).toBe(false);
    expect(result.occurrences[0].assignments[0].isSelf).toBe(false);
  });

  // ---- Absences ----

  it("assignment marked isActive=false when it has matching absences", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const assignment = mockAssignment({
      shifts_shift: 1,
      shifts_from: "2025-03-15",
      shifts_is_regular: false,
      shifts_membership: {
        id: 10,
        shifts_can_be_coordinator: false,
        memberships_user: {
          username: "Absent",
          username_last: "User",
          hide_name: false,
          buddy_status: "keine_angabe",
        },
      },
    });
    const absence = {
      id: 500,
      shifts_from: "2025-03-14",
      shifts_to: "2025-03-16",
      shifts_assignment: 100,
      shifts_membership: 10,
      shifts_is_for_all_assignments: false,
    };
    setupDefaultMocks({ shifts: [shift], assignments: [assignment], absences: [absence] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false);
    const a = result.occurrences[0].assignments[0];
    expect(a.isActive).toBe(false);
    expect(a.absences.length).toBeGreaterThan(0);
    expect(result.occurrences[0].n_assigned).toBe(0);
  });

  // ---- Public holidays ----

  it("excludes public holiday occurrences when exclude_public_holidays=true", async () => {
    const shift = mockShift({
      shifts_is_regular: false,
      shifts_from: "2025-03-15",
      exclude_public_holidays: true,
    });
    const publicHoliday = { date: "2025-03-15" };
    setupDefaultMocks({ shifts: [shift], publicHolidays: [publicHoliday] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"));

    // The shift on a public holiday should be excluded
    expect(result.occurrences.length).toBe(0);
    expect(result.publicHolidays).toEqual([{ date: "2025-03-15" }]);
  });

  it("keeps public holiday occurrences when exclude_public_holidays=false", async () => {
    const shift = mockShift({
      shifts_is_regular: false,
      shifts_from: "2025-03-15",
      exclude_public_holidays: false,
    });
    const publicHoliday = { date: "2025-03-15" };
    setupDefaultMocks({ shifts: [shift], publicHolidays: [publicHoliday] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"));
    expect(result.occurrences.length).toBe(1);
  });

  // ---- Shift field filtering ----

  it("shift object only contains OccurrenceShift fields (no shifts_status)", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    setupDefaultMocks({ shifts: [shift] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"));
    expect(result.occurrences.length).toBe(1);
    const s = result.occurrences[0].shift;
    expect(s).toHaveProperty("id");
    expect(s).toHaveProperty("shifts_name");
    expect(s).toHaveProperty("shifts_slots");
    expect(s).not.toHaveProperty("shifts_status");
    expect(s).not.toHaveProperty("shifts_allow_self_assignment");
  });

  // ---- n_assigned and multiple assignments ----

  it("n_assigned counts only active assignments", async () => {
    const shift = mockShift({ shifts_is_regular: false, shifts_from: "2025-03-15" });
    const a1 = mockAssignment({
      id: 100, shifts_shift: 1, shifts_from: "2025-03-15", shifts_is_regular: false,
      shifts_membership: {
        id: 10,
        shifts_can_be_coordinator: false,
        memberships_user: { username: "A", username_last: "A", hide_name: false, buddy_status: "keine_angabe" },
      },
    });
    const a2 = mockAssignment({
      id: 101, shifts_shift: 1, shifts_from: "2025-03-15", shifts_is_regular: false,
      shifts_membership: {
        id: 11,
        shifts_can_be_coordinator: false,
        memberships_user: { username: "B", username_last: "B", hide_name: false, buddy_status: "keine_angabe" },
      },
    });
    // a2 is absent
    const absence = {
      id: 600,
      shifts_from: "2025-03-14",
      shifts_to: "2025-03-16",
      shifts_assignment: 101,
      shifts_membership: 11,
      shifts_is_for_all_assignments: false,
    };
    setupDefaultMocks({ shifts: [shift], assignments: [a1, a2], absences: [absence] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"));
    expect(result.occurrences[0].assignments.length).toBe(2);
    expect(result.occurrences[0].n_assigned).toBe(1);
  });

  // ---- Start/end time formatting ----

  it("occurrence start/end include shift times as ISO strings", async () => {
    const shift = mockShift({
      shifts_is_regular: false,
      shifts_from: "2025-03-15",
      shifts_from_time: "09:30:00",
      shifts_to_time: "13:00:00",
    });
    setupDefaultMocks({ shifts: [shift] });

    const result = await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"));
    expect(result.occurrences[0].start).toContain("2025-03-15");
    expect(result.occurrences[0].start).toContain("09:30:00");
    expect(result.occurrences[0].end).toContain("13:00:00");
  });

  // ---- publicHolidays pass-through ----

  it("publicHolidays returns only { date } objects", async () => {
    setupDefaultMocks({
      publicHolidays: [
        { id: 1, name: "Christmas", date: "2025-12-25" },
        { id: 2, name: "New Year", date: "2026-01-01" },
      ],
    });

    const result = await getShiftOccurrencesForApi(utc("2025-12-01"), utc("2026-01-31"));
    expect(result.publicHolidays).toEqual([
      { date: "2025-12-25" },
      { date: "2026-01-01" },
    ]);
  });

  // ---- dbGetAssignmentsForApi called with correct admin flag ----

  it("passes admin=false to dbGetAssignmentsForApi for non-admin requests", async () => {
    setupDefaultMocks({ shifts: [mockShift()] });
    await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), false);
    expect(stubs.dbGetAssignmentsForApi).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Date),
      expect.any(Date),
      false,
    );
  });

  it("passes admin=true to dbGetAssignmentsForApi for admin requests", async () => {
    setupDefaultMocks({ shifts: [mockShift()] });
    await getShiftOccurrencesForApi(utc("2025-03-01"), utc("2025-03-31"), true);
    expect(stubs.dbGetAssignmentsForApi).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Date),
      expect.any(Date),
      true,
    );
  });
});
