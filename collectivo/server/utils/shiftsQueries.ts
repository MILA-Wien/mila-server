import {
  createItem,
  deleteItem,
  readItem,
  readItems,
  readSingleton,
  updateItem,
} from "@directus/sdk";
import type { QueryFilter } from "@directus/sdk";
import { RRule, RRuleSet } from "rrule";
import { parseUtcMidnight } from "./dates";
import { ShiftsShift } from "./dbSchema";

const directus = useDirectusAdmin();

export async function getShiftShifts(
  from: Date,
  to: Date,
  shiftID?: number,
  loadCat?: boolean = false,
) {
  const filter: QueryFilter<DbSchema, ShiftsShift> = {
    _or: [
      {
        shifts_is_regular: { _eq: false },
        shifts_from: { _gte: from.toISOString(), _lte: to.toISOString() },
      },
      {
        shifts_is_regular: { _eq: true },
        shifts_to: {
          _or: [{ _gte: from.toISOString() }, { _null: true }],
        },
        shifts_from: { _lte: to.toISOString() },
      },
    ],

    shifts_status: { _eq: "published" },
  };
  if (shiftID) {
    filter.id = { _eq: shiftID };
  }
  const shifts = await directus.request(
    readItems("shifts_shifts", {
      filter: filter,
      limit: -1,
      // @ts-expect-error shifts_category_2.* is a nested field syntax
      fields: loadCat ? ["*", "shifts_category_2.*"] : ["*"],
    }),
  );

  return shifts;
}

export async function getShiftAssignments(
  shiftIds: number[],
  from: Date,
  to: Date,
) {
  if (shiftIds.length === 0) {
    return [];
  }

  return await directus.request(
    readItems("shifts_assignments", {
      limit: -1,
      filter: {
        _or: [
          {
            shifts_is_regular: { _eq: false },
            shifts_from: { _gte: from.toISOString(), _lte: to.toISOString() },
          },
          {
            shifts_is_regular: { _eq: true },
            shifts_to: {
              _or: [{ _gte: from.toISOString() }, { _null: true }],
            },
            shifts_from: { _lte: to.toISOString() },
          },
        ],
        shifts_shift: {
          _in: shiftIds,
        },
      },
      fields: [
        "id",
        "shifts_from",
        "shifts_to",
        "shifts_shift",
        "shifts_is_regular",
        {
          shifts_membership: [
            "id",
            "shifts_counter",
            "count(shifts_logs)",
            "shifts_can_be_coordinator",
            {
              memberships_user: [
                "id",
                "username",
                "username_last",
                "hide_name",
                "email",
                "memberships_phone",
                "send_notifications",
                "buddy_status",
              ],
            },
          ],
        },
      ],
    }),
  );
}

export async function getShiftAbsences(
  assignmentIds: number[],
  from: Date,
  to: Date,
) {
  if (assignmentIds.length === 0) {
    return [];
  }
  return await directus.request(
    readItems("shifts_absences", {
      limit: -1,
      filter: {
        _or: [
          { shifts_to: { _gte: from.toISOString() } },
          { shifts_from: { _lte: to.toISOString() } },
        ],
      },
      fields: [
        "shifts_membership",
        "shifts_from",
        "shifts_to",
        "shifts_assignment",
      ],
    }),
  );
}

export async function getShiftPublicHolidays(from: Date, to: Date) {
  return await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          _and: [{ _gte: from.toISOString() }, { _lte: to.toISOString() }],
        },
      },
      limit: -1,
      fields: ["date"],
    }),
  );
}

export async function getFutureHolidayRrule() {
  const now = getCurrentDate();
  const directus = useDirectusAdmin();
  const publicHolidays = (await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          // @ts-expect-error directus date filter bug
          _and: [{ _gte: now }],
        },
      },
      limit: -1,
      fields: ["date"],
    }),
  )) as ShiftsPublicHoliday[];

  const publicHolidaRruleSet = new RRuleSet();
  publicHolidays.forEach((holiday) => {
    publicHolidaRruleSet.rrule(
      new RRule({
        dtstart: new Date(holiday.date),
        count: 1,
      }),
    );
  });

  return publicHolidaRruleSet;
}

// Create a RRule object for a shift
// Shifts without end date run forever
// Shifts without repetition run once
// Dates are with T=00:00:00 UTC
export const getShiftRrule = (
  shift: ShiftsShift,
  publicHolidays?: Pick<ShiftsPublicHoliday, "date">[],
): RRuleSet => {
  const rruleSet = new RRuleSet();
  const mainShiftRule = new RRule({
    freq: RRule.DAILY,
    interval: shift.shifts_repeats_every,
    count: shift.shifts_is_regular ? null : 1,
    dtstart: parseUtcMidnight(shift.shifts_from),
    until: shift.shifts_is_regular
      ? shift.shifts_to
        ? parseUtcMidnight(shift.shifts_to)
        : null
      : parseUtcMidnight(shift.shifts_from),
  });

  rruleSet.rrule(mainShiftRule);

  // Exclude public holidays
  if (shift.exclude_public_holidays) {
    for (const holiday of publicHolidays ?? []) {
      const holidayRule = new RRule({
        freq: RRule.DAILY,
        interval: 1,
        dtstart: parseUtcMidnight(holiday.date),
        until: parseUtcMidnight(holiday.date),
      });
      rruleSet.exrule(holidayRule);
    }
  }
  return rruleSet;
};

export const createAssignmentRrule = (
  fromString: string,
  toString: string | null | undefined,
  interval: number | undefined,
  regular: boolean,
  shiftRule: RRuleSet | RRule,
) => {
  let until: Date | null = null;
  let invalid = false;

  const dtstart = shiftRule.after(parseUtcMidnight(fromString), true);
  if (!dtstart) {
    invalid = true;
  }

  // One time shifts have same from and to date
  const assignmentTo = regular ? toString : fromString;

  if (assignmentTo) {
    until = shiftRule.before(parseUtcMidnight(assignmentTo), true);
    if (!until) {
      invalid = true;
    }
  }

  return new RRule({
    freq: RRule.DAILY,
    interval: interval,
    count: invalid ? 0 : regular ? null : 1,
    dtstart: dtstart,
    until: until,
  });
};

export const getAssignmentRrules = (
  shift: ShiftsShift,
  shiftRule: RRule,
  assignments: ShiftsAssignmentsQuery,
  absences: ShiftsAbsence[],
  holidayRrule?: RRule,
): AssignmentRrule[] => {
  const assignmentRules: AssignmentRrule[] = [];

  for (const assignment of assignments) {
    const assRrule = new RRuleSet();
    const assRruleWithAbs = new RRuleSet();

    const mainRule = createAssignmentRrule(
      assignment.shifts_from,
      assignment.shifts_to,
      shift.shifts_repeats_every,
      assignment.shifts_is_regular,
      shiftRule,
    );

    assRrule.rrule(mainRule);
    assRruleWithAbs.rrule(mainRule);

    // Case 1: Absence for this assignment
    // Case 2: Absence for the same membership and all assignments
    const filteredAbsences = absences.filter(
      (absence) =>
        absence.shifts_assignment == assignment.id ||
        (absence.shifts_assignment == null &&
          absence.shifts_membership ==
            (assignment.shifts_membership as Membership).id),
    );

    const absenceRrules = [];
    for (const absence of filteredAbsences) {
      const absenceRule = new RRule({
        freq: RRule.DAILY,
        interval: 1,
        dtstart: parseUtcMidnight(absence.shifts_from),
        until: parseUtcMidnight(absence.shifts_to),
      });

      absenceRrules.push({
        absence: absence as ShiftsAbsence,
        rrule: absenceRule,
      });
      assRruleWithAbs.exrule(absenceRule);
      if (holidayRrule) {
        assRruleWithAbs.exrule(holidayRrule);
      }
    }

    assignmentRules.push({
      shift: shift,
      assignment: assignment,
      absences: absenceRrules,
      rrule: assRrule,
      rruleWithAbsences: assRruleWithAbs,
    });
  }

  return assignmentRules;
};

// ============================================================================
// SHIFT CATEGORIES
// ============================================================================

export async function getShiftCategories() {
  return await directus.request(
    readItems("shifts_categories", {
      limit: -1,
      fields: ["id", "name", "beschreibung", "for_all"],
    }),
  );
}

// ============================================================================
// SHIFT LOGS
// ============================================================================

export async function getShiftLogsForShift(date: string, shiftID: number) {
  return await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_shift: { _eq: shiftID },
        shifts_date: { _eq: date },
      },
      fields: [
        "id",
        "shifts_type",
        "shifts_note",
        "shifts_score",
        {
          shifts_membership: [
            "id",
            { memberships_user: ["username", "username_last", "email"] },
          ],
        },
      ],
    }),
  );
}

export async function updateShiftLog(
  logID: number,
  type: "attended" | "missed",
) {
  const payload: { shifts_type: string; shifts_score: number } = {
    shifts_type: type,
    shifts_score: type === "attended" ? 28 : 0,
  };
  return await directus.request(updateItem("shifts_logs", logID, payload));
}

export async function deleteShiftLog(logID: number) {
  return await directus.request(deleteItem("shifts_logs", logID));
}

export async function createShiftLog(
  type: string,
  mshipID: number,
  date: string,
  shiftID?: number,
  score?: number,
  note?: string,
) {
  const finalScore = score ?? (type === "attended" ? 28 : 0);
  return await directus.request(
    createItem(
      "shifts_logs",
      {
        shifts_membership: mshipID,
        shifts_type: type,
        shifts_date: date,
        shifts_score: finalScore,
        shifts_note: note,
        shifts_shift: shiftID,
      },
      {
        fields: [
          "id",
          "shifts_type",
          "shifts_note",
          "shifts_score",
          {
            shifts_membership: [
              "id",
              { memberships_user: ["username", "username_last", "email"] },
            ],
          },
        ],
      },
    ),
  );
}

export async function checkIfFirstShift(mshipId: number) {
  const logs = await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_membership: {
          _eq: mshipId,
        },
        shifts_type: {
          _in: ["attended", "attended_draft"],
        },
      },
      limit: 1,
    }),
  );
  return logs.length === 0;
}

// ============================================================================
// SHIFT ASSIGNMENTS CRUD
// ============================================================================

export async function createShiftAssignment(payload: {
  shifts_membership: number;
  shifts_shift: number;
  shifts_from: string;
  shifts_is_regular: boolean;
  shifts_to?: string;
}) {
  return await directus.request(
    createItem("shifts_assignments", payload, {
      fields: [
        "id",
        "shifts_membership",
        "shifts_is_regular",
        "shifts_shift",
        "shifts_from",
        "shifts_to",
        {
          shifts_membership: [
            "id",
            {
              memberships_user: ["username", "username_last", "email"],
            },
          ],
        },
      ],
    }),
  );
}

export async function updateShiftAssignment(
  assignmentId: number,
  payload: { shifts_to?: string },
) {
  return await directus.request(
    updateItem("shifts_assignments", assignmentId, payload),
  );
}

export async function deleteShiftAssignment(assignmentId: number) {
  return await directus.request(deleteItem("shifts_assignments", assignmentId));
}

// ============================================================================
// SHIFT ABSENCES CRUD
// ============================================================================

export async function createShiftAbsence(payload: {
  shifts_membership: number;
  shifts_from: string;
  shifts_to: string;
  shifts_is_holiday?: boolean;
  shifts_is_for_all_assignments?: boolean;
  shifts_assignment?: number;
  shifts_status?: string;
}) {
  return await directus.request(createItem("shifts_absences", payload));
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSettings() {
  return await directus.request(readSingleton("settings_hidden"));
}

// ============================================================================
// MEMBERSHIPS
// ============================================================================

export async function getMembershipById(id: number) {
  return await directus.request(
    readItem("memberships", id, {
      fields: [
        "id",
        { memberships_user: ["username", "username_last"] },
        "memberships_type",
        "memberships_status",
        "shifts_categories_allowed",
        "shifts_user_type",
        "shifts_can_be_coordinator",
      ],
    }),
  );
}

// ============================================================================
// TILES
// ============================================================================

export async function getTiles() {
  return await directus.request(
    readItems("collectivo_tiles", {
      // @ts-expect-error tiles_buttons is a nested field
      fields: ["*", { tiles_buttons: ["*"] }],
      filter: {
        tiles_view_for: {
          _neq: "hide",
        },
      },
    }),
  );
}
