import { createItems, readItems, readUsers } from "@directus/sdk";
import { RRule, RRuleSet } from "rrule";

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);

  console.log("Receiving request to send reminders");
  getAssignments();
  //   const users = (await directus.request(
  //     readUsers({
  //       fields: ["id", "shifts_user_type"],
  //     }),
  //   )) as ShiftUser[];
});

async function getAssignments() {
  const directus = await useDirectusAdmin();
  const targetDate = getFutureDate(2);
  console.log("Goal is to get assignments for", targetDate);

  const shifts: ShiftsShift[] = (await directus.request(
    readItems("shifts_shifts", {
      filter: {
        shifts_to: {
          _or: [{ _gte: targetDate }, { _null: true }],
        },
        shifts_from: { _lte: targetDate },
        shifts_status: { _eq: "published" },
      },
      fields: ["*"],
    }),
  )) as ShiftsShift[];

  // Get assignments two days ahead
  const assignments = (await directus.request(
    readItems("shifts_assignments", {
      filter: {
        shifts_to: {
          _or: [{ _gte: targetDate }, { _null: true }],
        },
        shifts_from: { _lte: targetDate },
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
            {
              memberships_user: ["id", "first_name", "last_name", "email"],
            },
          ],
        },
      ],
    }),
  )) as ShiftsAssignment[];

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
            { shifts_to: { _gte: targetDate } },
            { shifts_from: { _lte: targetDate } },
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

  const assignmentRules: AssignmentRrule[] = [];

  for (const shift of shifts) {
    const shiftRule = getShiftRrule(shift);

    const filteredAssignments = assignments.filter(
      (assignment) => assignment.shifts_shift === shift.id,
    );

    const rules = getAssignmentRrules(
      shift,
      shiftRule,
      filteredAssignments,
      absences,
    );

    assignmentRules.push(...rules);
  }

  const occurrences = [];

  for (const rule of assignmentRules) {
    const occs = rule.rruleWithAbsences.between(targetDate, targetDate, true);
    for (const occ of occs) {
      occurrences.push({
        assignment: rule,
        date: occ,
      });
    }
  }

  for (const occ of occurrences) {
    const assignment = occ.assignment.assignment;
    const user = assignment.shifts_membership.memberships_user;

    console.log(
      "Sending reminder for assignment",
      user.first_name,
      user.last_name,
      user.email,
      user.id,
    );
  }
}

// Create a RRule object for a shift
// Shifts without end date run forever
// Shifts without repetition run once
// Dates are with T=00:00:00 UTC
export const getShiftRrule = (shift: ShiftsShift): RRule => {
  return new RRule({
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

    const mainRule = new RRule({
      freq: RRule.DAILY,
      interval: shift.shifts_repeats_every,
      dtstart: shiftRule.after(new Date(assignment.shifts_from), true),
      until: assignment.shifts_is_regular
        ? assignment.shifts_to
          ? shiftRule.before(new Date(assignment.shifts_to), true)
          : null
        : shiftRule.before(new Date(assignment.shifts_from), true),
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
