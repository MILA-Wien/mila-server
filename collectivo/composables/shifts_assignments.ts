import { RRule, RRuleSet } from "rrule";
import { readItems } from "@directus/sdk";

export const getActiveAssignments = async (
  mship: MembershipsMembership,
  shiftID?: number,
) => {
  const directus = useDirectus();
  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const filter = {
    shifts_membership: { id: { _eq: mship.id } },
    shifts_to: {
      _or: [{ _gte: nowStr }, { _null: true }],
    },
  };
  if (shiftID) {
    filter["shifts_shift"] = { id: { _eq: shiftID } };
  }
  const assignments = (await directus.request(
    readItems("shifts_assignments", {
      filter: filter,
      fields: [
        "*",
        { shifts_shift: ["*"] },
        {
          shifts_membership: { memberships_user: ["first_name", "last_name"] },
        },
      ],
    }),
  )) as ShiftsAssignment[];

  const absences = (await directus.request(
    readItems("shifts_absences", {
      filter: {
        shifts_membership: { id: { _eq: mship.id } },
        shifts_status: {
          _eq: "accepted",
        },
        shifts_assignment: {
          shifts_membership: { id: { _eq: mship.id } },
        },
        shifts_to: { _gte: nowStr },
      },
      fields: [
        "*",
        { shifts_shift: ["*"] },
        {
          shifts_membership: { memberships_user: ["first_name", "last_name"] },
        },
      ],
    }),
  )) as ShiftsAbsence[];

  const assignmentRules: ShiftsAssignmentRules[] = assignments.map(
    (assignment) => {
      const filteredAbsences = absences.filter(
        (absence) =>
          absence.shifts_assignment == assignment.id ||
          absence.shifts_assignment == null,
      );

      const rules = getAssignmentRRule(assignment, filteredAbsences);

      const assignmentRule = rules[0];
      const absencesRule = rules[1];
      const nextOccurence = assignmentRule.after(now, true);
      let secondNextOccurence = null;

      if (nextOccurence) {
        secondNextOccurence = assignmentRule.after(nextOccurence);
      }

      return {
        assignment: assignment,
        absences: filteredAbsences,
        assignmentRule: assignmentRule,
        absencesRule: absencesRule,
        nextOccurrence: nextOccurence,
        isRegular: secondNextOccurence != null,
      };
    },
  );

  assignmentRules.sort((a, b) => {
    const nextA = a.assignmentRule.after(now, true);
    const nextB = b.assignmentRule.after(now, true);
    if (!nextA && !nextB) return 0;
    if (!nextA) return 1;
    if (!nextB) return -1;
    if (nextA == nextB) return 0;
    return nextA > nextB ? 1 : -1;
  });

  return assignmentRules;
};

// Get assignment rrule
// Creates a slice of the shift rrule within the assignment timeframe
export const getAssignmentRRule = (
  assignment: ShiftsAssignment,
  absences?: ShiftsAbsence[],
) => {
  const shift = assignment.shifts_shift as ShiftsShift;

  const shiftRule = getShiftRrule(shift);

  const assignmentRule = new RRuleSet();
  const absencesRule = new RRuleSet();

  // Main shift rule
  assignmentRule.rrule(
    new RRule({
      freq: RRule.DAILY,
      interval: shift.shifts_repeats_every,
      count: shift.shifts_repeats_every ? null : 1,
      dtstart: shiftRule.after(new Date(assignment.shifts_from), true),
      until: assignment.shifts_to
        ? shiftRule.before(new Date(assignment.shifts_to), true)
        : null,
    }),
  );

  // Absence rules
  absences?.forEach((absence) => {
    const absenceRule = new RRule({
      freq: RRule.DAILY,
      interval: shift.shifts_repeats_every,
      dtstart: shiftRule.after(new Date(absence.shifts_from), true),
      until: shiftRule.before(new Date(absence.shifts_to), true),
    });

    absencesRule.rrule(absenceRule);
    assignmentRule.exrule(absenceRule);
  });

  return [assignmentRule, absencesRule];
};

// export const getNextAssignmentOccurence = (
//   assignment: ShiftsAssignment,
// ): Date | null => {
//   return getAssignmentRRule(assignment)[0].after(new Date());
// };

// export const getActiveAssignment = (
//   assignments: ShiftsAssignment[],
//   atDate?: DateTime,
// ): ShiftsAssignment | null => {
//   for (const assignment of assignments) {
//     if (isShiftDurationModelActive(assignment, atDate)) return assignment;
//   }

//   return null;
// };

// export const getAssigneeName = (
//   assignments: ShiftsAssignment[],
//   atDate?: DateTime,
// ) => {
//   if (!atDate) {
//     atDate = DateTime.now();
//   }

//   const assignment = getActiveAssignment(assignments, atDate);
//   const mship = assignment?.shifts_membership as MembershipsMembership;
//   if (!assignment)
//     return "No assignee on " + atDate.toLocaleString(DateTime.DATE_SHORT);

//   if (typeof assignment.shifts_membership == "string") {
//     throw new Error("Assignment shifts_membership field must be loaded");
//   }

//   return (
//     mship.memberships_user.first_name +
//     " " +
//     mship.memberships_user.last_name[0] +
//     "."
//   );
// };
