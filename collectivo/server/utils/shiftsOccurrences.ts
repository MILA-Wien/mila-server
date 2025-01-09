import type { RRule } from "rrule";

export const getShiftOccurrences = async (
  from: Date,
  to: Date,
  admin: boolean = false,
  shiftID?: number,
  mship?: number,
) => {
  // Get shifts within timeframe
  const shifts = await getShiftShifts(from, to, shiftID);
  const shiftIds = shifts.map((shift) => shift.id);

  // Get assignments within timeframe
  const assignments = await getShiftAssignments(shiftIds, from, to);
  const assignmentIds = assignments.map((assignment) => assignment.id);

  // Hide names if not admin
  if (!admin) {
    for (const assignment of assignments) {
      if (assignment.shifts_membership.memberships_user.hide_name) {
        assignment.shifts_membership.memberships_user.first_name = "";
        assignment.shifts_membership.memberships_user.last_name = "";
      }
    }
  }

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
      absences as ShiftsAbsence[],
      from,
      to,
      publicHolidays,
      mship,
    );
    occurrences.push(...occ);
  }

  occurrences.sort((a, b) => {
    return a.start.getTime() - b.start.getTime();
  });

  return { occurrences, publicHolidays };
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
  absences: ShiftsAbsence[],
  from: Date,
  to: Date,
  publicHolidays: Pick<ShiftsPublicHoliday, "date">[],
  mship?: number,
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
      createShiftOccurrence(shift, date, shiftRule, assignmentRrules, mship),
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
  mship?: number,
): ShiftOccurrence => {
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
          (mship &&
            typeof occ.assignment.shifts_membership == "object" &&
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
