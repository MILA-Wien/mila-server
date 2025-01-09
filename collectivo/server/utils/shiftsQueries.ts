import { readItems } from "@directus/sdk";
import type { QueryFilter } from "@directus/sdk";
import { RRule, RRuleSet } from "rrule";

const directus = useDirectusAdmin();

export async function getShiftShifts(
  from: Date,
  to: Date,
  shiftID?: number,
): Promise<ShiftsShift[]> {
  const filter: QueryFilter<DbSchema, ShiftsShift> = {
    shifts_to: {
      _or: [{ _gte: from.toISOString() }, { _null: true }],
    },
    shifts_from: { _lte: to.toISOString() },
    shifts_status: { _eq: "published" },
  };
  if (shiftID) {
    filter.id = { _eq: shiftID };
  }
  const shifts = await directus.request(
    readItems("shifts_shifts", {
      filter: filter,
      limit: -1,
      fields: ["*"],
    }),
  );

  return shifts;
}

export async function getShiftAssignments(
  shiftIds: number[],
  from: Date,
  to: Date,
) {
  console.log("getting assignments");
  if (shiftIds.length === 0) {
    return [];
  }
  return await directus.request(
    readItems("shifts_assignments", {
      limit: -1,
      filter: {
        shifts_to: {
          _or: [{ _gte: from.toISOString() }, { _null: true }],
        },
        shifts_from: { _lte: to.toISOString() },
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
        "shifts_is_coordination",
        {
          shifts_membership: [
            "id",
            "shifts_counter",
            "count(shifts_logs)",
            {
              memberships_user: ["first_name", "last_name", "hide_name"],
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
        shifts_status: {
          _eq: "accepted",
        },
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
    dtstart: new Date(shift.shifts_from),
    until: shift.shifts_is_regular
      ? shift.shifts_to
        ? new Date(shift.shifts_to)
        : null
      : new Date(shift.shifts_from),
  });

  rruleSet.rrule(mainShiftRule);

  // Exclude public holidays
  if (shift.exclude_public_holidays) {
    for (const holiday of publicHolidays ?? []) {
      const holidayRule = new RRule({
        freq: RRule.DAILY,
        interval: 1,
        dtstart: new Date(holiday.date),
        until: new Date(holiday.date),
      });
      rruleSet.exrule(holidayRule);
    }
  }
  return rruleSet;
};

export const getAssignmentRrules = (
  shift: ShiftsShift,
  shiftRule: RRule,
  assignments: ShiftsAssignment[],
  absences: ShiftsAbsence[],
): AssignmentRrule[] => {
  const assignmentRules: AssignmentRrule[] = [];

  for (const assignment of assignments) {
    const assRrule = new RRuleSet();
    const assRruleWithAbs = new RRuleSet();

    const mainRule = new RRule({
      freq: RRule.DAILY,
      interval: shift.shifts_repeats_every,
      dtstart: shiftRule.after(new Date(assignment.shifts_from), true),
      until: !assignment.shifts_is_regular
        ? new Date(assignment.shifts_from)
        : assignment.shifts_to
          ? new Date(assignment.shifts_to)
          : shift.shifts_to
            ? new Date(shift.shifts_to)
            : null,
    });

    assRrule.rrule(mainRule);
    assRruleWithAbs.rrule(mainRule);

    // Case 1: Absence for this assignment
    // Case 2: Absence for the same membership and all assignments
    const filteredAbsences = absences.filter(
      (absence) =>
        absence.shifts_assignment == assignment.id ||
        (absence.shifts_assignment == null &&
          absence.shifts_membership ==
            (assignment.shifts_membership as MembershipsMembership).id),
    );

    const absenceRrules = [];
    for (const absence of filteredAbsences) {
      const absenceRule = new RRule({
        freq: RRule.DAILY,
        interval: shift.shifts_repeats_every,
        dtstart: shiftRule.after(new Date(absence.shifts_from), true),
        until: shiftRule.before(new Date(absence.shifts_to), true),
      });
      absenceRrules.push({
        absence: absence as ShiftsAbsence,
        rrule: absenceRule,
      });
      absence.shifts_assignment = assignment;
      assRruleWithAbs.exrule(absenceRule);
    }

    assignmentRules.push({
      assignment: assignment,
      absences: absenceRrules,
      rrule: assRrule,
      rruleWithAbsences: assRruleWithAbs,
    });
  }

  return assignmentRules;
};
