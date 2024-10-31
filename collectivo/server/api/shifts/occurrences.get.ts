import { z } from "zod";
import { RRule, RRuleSet } from "rrule";
import {
  getShiftAbsences,
  getShiftAssignments,
  getShiftPublicHolidays,
  getShiftShifts,
} from "~/server/utils/shifts";

type ResAbsences = Awaited<ReturnType<typeof getShiftAbsences>>;

const querySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  filterStatus: z.enum(["regular", "jumper", "unfilled"]).optional(),
  filterCategory: z.string().optional(),
  admin: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const params = await getValidatedQuery(event, querySchema.parse);
  return getShiftOccurrences(
    event.context.auth,
    params.from,
    params.to,
    params.filterStatus,
    params.filterCategory,
    false,
    params.admin,
  );
});

export const getShiftOccurrences = async (
  userInfo: ServerUserInfo,
  from: Date,
  to: Date,
  filterStatus?: "regular" | "jumper" | "unfilled",
  filterCategory?: string,
  filterUnfilled: boolean = false,
  admin: boolean = false,
): Promise<ShiftOccurrence[]> => {
  // Get shifts within timeframe
  const shifts = await getShiftShifts(from, to, filterCategory);
  const shiftIds = shifts.map((shift) => shift.id);

  // Get assignments within timeframe
  const assignments = await getShiftAssignments(shiftIds, from, to, admin);
  const assignmentIds = assignments.map((assignment) => assignment.id);

  // Get absences within timeframe
  const absences = await getShiftAbsences(assignmentIds, from, to);

  // Get public holidays within timeframe
  const publicHolidays = await getShiftPublicHolidays(from, to);

  // Get occurrences for each shift
  const occurrences = [];
  for (const shift of shifts) {
    const occ = await getSingleShiftOccurrences(
      shift,
      assignments,
      absences,
      from,
      to,
      publicHolidays,
      userInfo,
    );
    occurrences.push(...occ);
  }

  occurrences.sort((a, b) => {
    return a.start.getTime() - b.start.getTime();
  });

  // Show only shifts with unfilled slots
  if (filterUnfilled) {
    return occurrences.filter(
      (occurrence) => occurrence.n_assigned < occurrence.shift.shifts_slots,
    );
  }

  return occurrences;
};

// Get all occurrences for a shift in a given timeframe
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
async function getSingleShiftOccurrences(
  shift: ShiftsShift,
  assignments: ShiftsAssignment[],
  absences: ResAbsences,
  from: Date,
  to: Date,
  publicHolidays: Pick<ShiftsPublicHoliday, "date">[],
  userInfo: ServerUserInfo,
) {
  const shiftRule = getShiftRrule(shift, publicHolidays);
  const shiftAssignments = assignments.filter(
    (assignment) => assignment.shifts_shift === shift.id,
  );

  const assignmentRrules = getAssignmentRrules(
    shift,
    shiftRule,
    shiftAssignments,
    absences,
  );

  const dates = shiftRule.between(from, to, true);
  const shiftOccurrences: ShiftOccurrence[] = [];

  for (const date of dates) {
    shiftOccurrences.push(
      createShiftOccurrence(shift, date, shiftRule, assignmentRrules, userInfo),
    );
  }

  return shiftOccurrences;
}

// Get occurence object for a shift on a given date
// Includes information about shift, slots, and assignments
// Time is always given in UTC - even if meant for other timezones
const createShiftOccurrence = (
  shift: ShiftsShift,
  date: Date,
  shiftRule: RRule,
  assignmentRrules: AssignmentRrule[],
  userInfo: ServerUserInfo,
): ShiftOccurrence => {
  const mship = userInfo.mship;

  let n_assigned = 0;
  let selfAssigned = false;
  let needsCoordinator = shift.shifts_needs_coordinator;

  // Get all assignments for this shift
  const assignments: AssignmentOccurrence[] = [];
  for (const ass of assignmentRrules ?? []) {
    if (ass.rrule.between(date, date, true).length > 0) {
      const occ: AssignmentOccurrence = {
        assignment: ass.assignment,
        isOneTime: !ass.assignment.shifts_is_regular,
        absences: [],
      };

      for (const abs of ass.absences) {
        if (abs.rrule.between(date, date, true).length > 0) {
          occ.absences.push(abs.absence);
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
            occ.assignment.shifts_membership.id == mship) ||
          occ.assignment.shifts_membership == mship
        ) {
          selfAssigned = true;
        }
      }

      assignments.push(occ);
    }
  }

  const dateString = date.toISOString().split("T")[0];

  const start = new Date(
    `${dateString}T${shift.shifts_from_time || "00:00:00"}Z`,
  );

  const end = new Date(`${dateString}T${shift.shifts_to_time || "00:00:00"}Z`);

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
  absences: ResAbsences,
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
