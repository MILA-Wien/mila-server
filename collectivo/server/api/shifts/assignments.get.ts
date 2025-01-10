import { RRule, RRuleSet } from "rrule";
import { readItems } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  return getUserAssignments(event.context.auth.mship);
});

export const getUserAssignments = async (mship: number) => {
  const directus = useDirectusAdmin();
  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const filter = {
    shifts_membership: { id: { _eq: mship } },
    shifts_to: {
      _or: [{ _gte: nowStr }, { _null: true }],
    },
  };
  const assignments = (await directus.request(
    readItems("shifts_assignments", {
      filter: filter,
      limit: -1,
      fields: [
        "*",
        { shifts_shift: ["*"] },
        {
          shifts_membership: { memberships_user: ["first_name", "last_name"] },
        },
      ],
    }),
  )) as ShiftsAssignmentGet[];

  const absences = (await directus.request(
    readItems("shifts_absences", {
      limit: -1,
      filter: {
        _or: [
          { shifts_membership: { id: { _eq: mship } } },
          {
            shifts_assignment: { shifts_membership: { id: { _eq: mship } } },
          },
        ],

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
  )) as ShiftsAbsenceGet[];

  const holidays = [] as ShiftsAbsenceGet[];
  const holidaysCurrent = [] as ShiftsAbsenceGet[];

  // Get holidays
  for (const absence of absences) {
    if (absence.shifts_is_holiday) {
      holidays.push(absence);
      if (
        new Date(absence.shifts_from) <= new Date(nowStr) &&
        absence.shifts_status === "accepted"
      ) {
        holidaysCurrent.push(absence);
      }
    }
  }

  // Get public holidays
  const publicHolidays = (await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
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

  const assignmentRules: ShiftsAssignmentRules[] = await Promise.all(
    assignments.map(async (assignment) => {
      const filteredAbsences = absences.filter(
        (absence) =>
          (absence.shifts_assignment == assignment.id ||
            absence.shifts_assignment == null) &&
          absence.shifts_status == "accepted",
      );

      const rules = getAssignmentRRule(
        assignment,
        filteredAbsences,
        publicHolidaRruleSet,
      );

      const assignmentRule = rules[0];
      const absencesRule = rules[1];
      const nextOccurence = assignmentRule.after(now, true);
      let secondNextOccurence = null;
      let nextOccurrenceAbsent = null;
      const names = [];
      if (nextOccurence) {
        secondNextOccurence = assignmentRule.after(nextOccurence);

        // Get other assignments for this occurrence
        const otherAssignments = await getShiftAssignments(
          assignment.shifts_shift.id,
          nextOccurence,
          nextOccurence,
        );

        for (const a of otherAssignments) {
          const mship1 = a.shifts_membership;
          const user = mship1.memberships_user;
          if (mship1.id == mship) continue;
          names.push(
            !user.hide_name
              ? `${user.first_name} ${user.last_name}`
              : "Anonymous",
          );
        }

        // Solve absences here
        if (absencesRule) {
          nextOccurrenceAbsent =
            absencesRule.after(nextOccurence, true) != null;
        }
      }

      return {
        assignment: assignment,
        coworkers: names,
        absences: filteredAbsences,
        assignmentRule: assignmentRule,
        nextOccurrenceAbsent: nextOccurrenceAbsent,
        nextOccurrence: nextOccurence,
        isRegular: secondNextOccurence != null,
      };
    }),
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

  assignmentRules.forEach((rule) => {
    delete rule.assignmentRule;
    delete rule.absences;
  });

  return {
    assignmentRules: assignmentRules.filter((rule) => rule.nextOccurrence),
    absences: absences,
    holidays: holidays,
    holidaysCurrent: holidaysCurrent,
  };
};

// Get assignment rrule
// Creates a slice of the shift rrule within the assignment timeframe
export const getAssignmentRRule = (
  assignment: ShiftsAssignment,
  absences?: ShiftsAbsence[],
  publicHolidayDates?: RRuleSet,
) => {
  const shift = assignment.shifts_shift as ShiftsShift;

  const shiftRule = getShiftRrule(shift);

  const assignmentRule = new RRuleSet();
  const absencesRule = new RRuleSet();

  // Main assignment rule
  assignmentRule.rrule(
    new RRule({
      freq: RRule.DAILY,
      interval: shift.shifts_repeats_every,
      count: shift.shifts_repeats_every ? null : 1,
      dtstart: shiftRule.after(new Date(assignment.shifts_from), true),
      until: assignment.shifts_is_regular
        ? assignment.shifts_to
          ? shiftRule.before(new Date(assignment.shifts_to), true)
          : null
        : shiftRule.before(new Date(assignment.shifts_from), true),
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

  // Exclude public holidays
  assignmentRule.exrule(publicHolidayDates as RRule);

  return [assignmentRule, absencesRule];
};
