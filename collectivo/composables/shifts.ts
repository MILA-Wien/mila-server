import { readItems } from "@directus/sdk";
import type { QueryFilter } from "@directus/sdk";
import { DateTime } from "luxon";
import { RRule, RRuleSet } from "rrule";

interface GetShiftOccurrencesOptions {
  shiftType?: "regular" | "jumper" | "unfilled" | "all";
  shiftCategory?: string;
  admin?: boolean;
}

export const getShiftOccurrences = async (
  from: DateTime,
  to: DateTime,
  options: GetShiftOccurrencesOptions = {},
): Promise<ShiftOccurrence[]> => {
  const directus = useDirectus();
  const { shiftType } = options;
  const isJumper = shiftType === "jumper";
  const isRegular = shiftType === "regular";
  const isUnfilled = shiftType === "unfilled";
  const isAll = shiftType === "all";

  // Get shifts within timeframe
  const filter: QueryFilter<DbSchema, ShiftsShift> = {
    shifts_to: {
      _or: [{ _gte: from.toISO() }, { _null: true }],
    },
    shifts_from: { _lte: to.toISO() },
    shifts_status: { _eq: "published" },
  };
  if (!options.admin) {
    filter.shifts_allow_self_assignment = { _eq: true };
  }
  if (options.shiftCategory != "all") {
    filter.shifts_category = { _eq: options.shiftCategory };
  }
  const shifts = (await directus.request(
    readItems("shifts_shifts", {
      filter: filter,
      limit: -1,
      fields: ["*"],
    }),
  )) as ShiftsShiftGet[];

  const shiftIds = shifts.map((shift) => shift.id);

  // Get assignments within timeframe
  const assignments =
    shiftIds.length > 0
      ? ((await directus.request(
          readItems("shifts_assignments", {
            limit: -1,
            filter: {
              shifts_to: {
                _or: [{ _gte: from.toISO() }, { _null: true }],
              },
              shifts_from: { _lte: to.toISO() },
              shifts_shift: {
                _in: shiftIds,
              },
            },
            fields: options.admin
              ? [
                  "id",
                  "shifts_from",
                  "shifts_to",
                  "shifts_shift",
                  "shifts_is_regular",
                  "shifts_is_coordination",
                  {
                    shifts_membership: [
                      "id",
                      {
                        memberships_user: ["first_name", "last_name", "email"],
                      },
                    ],
                  },
                ]
              : ["*"],
          }),
        )) as ShiftsAssignmentGet[])
      : ([] as ShiftsAssignmentGet[]);

  const assignmentIds = assignments.map((assignment) => assignment.id);

  // Get absences within timeframe
  const absences = [];
  if (assignmentIds.length) {
    const absences_ = (await directus.request(
      readItems("shifts_absences", {
        limit: -1,
        filter: {
          shifts_status: {
            _eq: "accepted",
          },
          _or: [
            { shifts_to: { _gte: from.toISO() } },
            { shifts_from: { _lte: to.toISO() } },
          ],
        },
        fields: [
          "shifts_membership",
          "shifts_from",
          "shifts_to",
          "shifts_assignment",
        ],
      }),
    )) as ShiftsAbsence[];
    absences.push(...absences_);
  }

  // Get public holidays within timeframe
  const publicHolidays = (await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          _and: [{ _gte: from.toISO() }, { _lte: to.toISO() }],
        },
      },
      limit: -1,
      fields: ["*"],
    }),
  )) as ShiftsPublicHoliday[];

  const occurrences = [];

  for (const shift of shifts) {
    const shiftRule = getShiftRrule(shift, publicHolidays);

    const filteredAssignments = assignments.filter(
      (assignment) => assignment.shifts_shift === shift.id,
    );

    const assignmentRrules = getAssignmentRrules(
      shift,
      shiftRule,
      filteredAssignments,
      absences,
    );

    const today = getCurrentDate();
    let minDate = from.toJSDate();
    const maxDate = to.toJSDate();

    // Jumper and regular can only be into the future
    if (
      (isJumper || isRegular || isUnfilled) &&
      minDate.getTime() < today.getTime()
    ) {
      minDate = today;
    }

    // Possible feature: Jumpers will only see the next 4 weeks
    // if (isJumper) {
    //   const jumperLimit = getFutureDate(28);

    //   if (jumperLimit < maxDate) {
    //     maxDate = jumperLimit;
    //   }
    // }

    const shiftOccurrences = getSingleShiftOccurrences(
      shift,
      shiftRule,
      assignmentRrules,
      minDate,
      maxDate,
    );

    // Show only shifts with open slots
    if (!isAll) {
      occurrences.push(
        ...shiftOccurrences.filter(
          (occurrence) => occurrence.n_assigned < occurrence.shift.shifts_slots,
        ),
      );
    } else {
      occurrences.push(...shiftOccurrences);
    }
  }

  occurrences.sort((a, b) => {
    return a.start.toMillis() - b.start.toMillis();
  });

  return occurrences;
};

// Get all occurrences for a shift in a given timeframe
export const getSingleShiftOccurrences = (
  shift: ShiftsShift,
  shiftRule: RRule,
  assignmentRrules: AssignmentRrule[],
  from: Date,
  to: Date,
  // isJumper?: boolean,
): ShiftOccurrence[] => {
  // Possible feature: Jumpers only see the next free instance of each shift
  // let dates: Date[] = [];
  // if (isJumper) {
  //   const nextDate = shiftRule.after(new Date(), true);
  //   if (nextDate) {
  //     dates.push(nextDate);
  //   }
  // } else {
  //   dates = shiftRule.between(from, to, true);
  // }
  const dates = shiftRule.between(from, to, true);
  const shiftOccurrences: ShiftOccurrence[] = [];

  for (const date of dates) {
    shiftOccurrences.push(
      getSingleShiftOccurence(shift, date, shiftRule, assignmentRrules),
    );
  }

  return shiftOccurrences;
};

// Get occurence object for a shift on a given date
// Includes information about shift, slots, and assignments
// Time is always given in UTC - even if meant for other timezones
const getSingleShiftOccurence = (
  shift: ShiftsShift,
  date: Date,
  shiftRule: RRule,
  assignmentRrules: AssignmentRrule[],
): ShiftOccurrence => {
  const mship = useCurrentUser().value.membership;
  const assignments: AssignmentOccurrence[] = [];
  let n_assigned = 0;
  let selfAssigned = false;
  let needsCoordinator = shift.shifts_needs_coordinator;

  for (const ass of assignmentRrules ?? []) {
    // This rule is true, should be false
    if (ass.rrule.between(date, date, true).length > 0) {
      const occ: AssignmentOccurrence = {
        assignment: ass.assignment,
        isOneTime: !ass.assignment.shifts_is_regular,
        absences: [],
      };

      for (const abs of ass.absences) {
        if (abs._rrule.between(date, date, true).length > 0) {
          occ.absences.push(abs);
        }
      }

      // Assignment is active?
      if (occ.absences.length == 0) {
        occ.isActive = true;
        n_assigned += 1;
        if (occ.assignment.shifts_is_coordination) {
          needsCoordinator = false;
        }
        if (
          (typeof occ.assignment.shifts_membership == "object" &&
            occ.assignment.shifts_membership.id == mship?.id) ||
          occ.assignment.shifts_membership == mship?.id
        ) {
          selfAssigned = true;
        }
      }

      assignments.push(occ);
    }
  }

  const dateString = date.toISOString().split("T")[0];

  const start = DateTime.fromISO(
    `${dateString}T${shift.shifts_from_time || "00:00:00"}Z`,
  ).toUTC();

  const end = DateTime.fromISO(
    `${dateString}T${shift.shifts_to_time || "00:00:00"}Z`,
  ).toUTC();

  return {
    shift: shift,
    start: start,
    end: end,
    shiftRule: shiftRule,
    n_assigned: n_assigned,
    assignments: assignments,
    selfAssigned: selfAssigned,
    needsCoordinator: needsCoordinator,
  };
};

// Create a RRule object for a shift
// Shifts without end date run forever
// Shifts without repetition run once
// Dates are with T=00:00:00 UTC
export const getShiftRrule = (
  shift: ShiftsShift,
  publicHolidays?: ShiftsPublicHoliday[],
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
            (assignment.shifts_membership as Membership).id),
    );

    for (const absence of filteredAbsences) {
      const absenceRule = new RRule({
        freq: RRule.DAILY,
        interval: shift.shifts_repeats_every,
        dtstart: shiftRule.after(new Date(absence.shifts_from), true),
        until: shiftRule.before(new Date(absence.shifts_to), true),
      });
      absence._rrule = absenceRule;
      absence.shifts_assignment = assignment;
      assRruleWithAbs.exrule(absenceRule);
    }

    assignmentRules.push({
      assignment: assignment,
      absences: filteredAbsences,
      rrule: assRrule,
      rruleWithAbsences: assRruleWithAbs,
    });
  }

  return assignmentRules;
};
