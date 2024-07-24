import { readItems } from "@directus/sdk";
import { DateTime } from "luxon";
import { RRule, RRuleSet } from "rrule";

interface GetShiftOccurrencesOptions {
  shiftType?: "regular" | "jumper" | "unfilled" | "all";
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

  const shifts: ShiftsShift[] = (await directus.request(
    readItems("shifts_shifts", {
      filter: {
        shifts_to: {
          _or: [{ _gte: from.toISO() }, { _null: true }],
        },
        shifts_from: { _lte: to.toISO() },
        shifts_status: { _eq: "published" },
      },
      fields: ["*"],
    }),
  )) as ShiftsShift[];

  // Create array of slot ids from shift.shift_slots in shifts
  const shiftIDs = [];
  for (const shift of shifts) {
    shiftIDs.push(shift.id);
  }

  const shiftIds = shifts.map((shift) => shift.id);

  // Get assignments within timeframe
  const assignments =
    shiftIDs.length > 0
      ? ((await directus.request(
          readItems("shifts_assignments", {
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
        )) as ShiftsAssignment[])
      : ([] as ShiftsAssignment[]);

  const assignmentIds = assignments.map((assignment) => assignment.id);

  const absences = [];
  if (assignmentIds.length) {
    const absences_ = (await directus.request(
      readItems("shifts_absences", {
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

  const occurrences = [];

  for (const shift of shifts) {
    const shiftRule = getShiftRrule(shift);

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
    let maxDate = to.toJSDate();

    // Jumper and regular can only be into the future
    if ((isJumper || isRegular || isUnfilled) && minDate < today) {
      minDate = today;
    }

    // Jumpers will only see the next 4 weeks
    if (isJumper) {
      const jumperLimit = getFutureDate(28);

      if (jumperLimit < maxDate) {
        maxDate = jumperLimit;
      }
    }

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
): ShiftOccurrence[] => {
  const dates: Date[] = shiftRule.between(from, to, true);

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
  const assignments: AssignmentOccurrence[] = [];
  let n_assigned = 0;

  for (const ass of assignmentRrules ?? []) {
    if (ass.rrule.between(date, date, true).length > 0) {
      const occ: AssignmentOccurrence = {
        assignment: ass.assignment,
        absences: [],
      };

      for (const abs of ass.absences) {
        if (abs._rrule.between(date, date, true).length > 0) {
          occ.absences.push(abs);
        }
      }

      if (occ.absences.length == 0) {
        n_assigned += 1;
      }

      assignments.push(occ);
    }
  }

  const dateString = date.toISOString().split("T")[0];

  const start = DateTime.fromISO(
    `${dateString}T${shift.shifts_from_time}Z`,
  ).toUTC();

  const end = DateTime.fromISO(
    `${dateString}T${shift.shifts_to_time}Z`,
  ).toUTC();

  return {
    shift: shift,
    start: start,
    end: end,
    shiftRule: shiftRule,
    n_assigned: n_assigned,
    assignments: assignments,
  };
};

// Create a RRule object for a shift
// Shifts without end date run forever
// Shifts without repetition run once
// Dates are with T=00:00:00 UTC
export const getShiftRrule = (shift: ShiftsShift): RRule => {
  return new RRule({
    freq: RRule.DAILY,
    interval: shift.shifts_repeats_every,
    count: shift.shifts_repeats_every ? null : 1,
    dtstart: new Date(shift.shifts_from),
    until: shift.shifts_to ? new Date(shift.shifts_to) : null,
  });
};

// SlotRrule is a RRuleSet that shows only free occurences
// Occurences with existing assignments are excluded
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

    assRrule.rrule(
      new RRule({
        freq: RRule.DAILY,
        interval: shift.shifts_repeats_every,
        dtstart: shiftRule.after(new Date(assignment.shifts_from), true),
        until: assignment.shifts_to
          ? shiftRule.before(new Date(assignment.shifts_to), true)
          : null,
      }),
    );

    const filteredAbsences = absences.filter(
      (absence) =>
        (absence.shifts_assignment == assignment.id ||
          absence.shifts_assignment == null) &&
        absence.shifts_membership ==
          (assignment.shifts_membership as MembershipsMembership).id,
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
      assRrule.exrule(absenceRule);
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

// TODO deprecated?

export const isShiftDurationModelActive = (
  durationModel: { shifts_from: string; shifts_to?: string },
  atDate?: DateTime,
): boolean => {
  return isFromToActive(
    DateTime.fromISO(durationModel.shifts_from),
    durationModel.shifts_to
      ? DateTime.fromISO(durationModel.shifts_to)
      : undefined,
    atDate,
    true,
  );
};

export const isFromToActive = (
  from: DateTime,
  to?: DateTime,
  atDate?: DateTime,
  dateOnly = true,
): boolean => {
  if (!atDate) {
    atDate = DateTime.now();
  }

  if (dateOnly) {
    from = from.startOf("day");
    to = to?.endOf("day");
  }

  if (from > atDate) {
    return false;
  }

  return !(to && to < atDate);
};
