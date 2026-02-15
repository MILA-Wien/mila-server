import { RRule, RRuleSet } from "rrule";
import { parseUtcMidnight } from "./dates";
import type { ShiftsShift } from "./dbSchema";

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
  assignments: ShiftsAssignment[],
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

export function buildHolidayRruleSet(
  holidays: Pick<ShiftsPublicHoliday, "date">[],
): RRuleSet {
  const rruleSet = new RRuleSet();
  holidays.forEach((holiday) => {
    rruleSet.rrule(
      new RRule({
        dtstart: new Date(holiday.date),
        count: 1,
      }),
    );
  });
  return rruleSet;
}

export async function getFutureHolidayRrule(): Promise<RRuleSet> {
  const holidays = await dbGetFuturePublicHolidays();
  return buildHolidayRruleSet(holidays);
}
