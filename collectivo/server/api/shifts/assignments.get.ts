// Get shift assignments and absences of current user

import { RRule, RRuleSet } from "rrule";
import { readItems } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  return getUserAssignments(event.context.auth.mship);
});

export const getUserAssignments = async (mship: number) => {
  const directus = useDirectusAdmin();
  const now = getCurrentDate();
  const nowStr = now.toISOString();

  // Get user shift assignments
  const assignments = (await directus.request(
    readItems("shifts_assignments", {
      filter: {
        shifts_membership: { id: { _eq: mship } },
        shifts_to: {
          _or: [{ _gte: nowStr }, { _null: true }],
        },
      },
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

  // Get user shift absences
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

  // Get user holidays
  const holidays = [] as ShiftsAbsenceGet[];
  const holidaysCurrent = [] as ShiftsAbsenceGet[];
  for (const absence of absences) {
    if (absence.shifts_is_holiday) {
      holidays.push(absence);
      if (new Date(absence.shifts_from) <= new Date(nowStr)) {
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

  // Get assignment infos
  const assignmentInfos = await Promise.all(
    assignments.map(async (assignment) => {
      return await getAssignmentInfos(
        assignment,
        absences,
        publicHolidaRruleSet,
        mship,
      );
    }),
  );

  assignmentInfos.sort((a, b) => {
    const nextA = a.nextOccurrence;
    const nextB = b.nextOccurrence;
    if (!nextA && !nextB) return 0;
    if (!nextA) return 1;
    if (!nextB) return -1;
    if (nextA == nextB) return 0;
    return nextA > nextB ? 1 : -1;
  });

  return {
    assignmentRules: assignmentInfos.filter((rule) => rule.nextOccurrence),
    absences: absences,
    holidays: holidays,
    holidaysCurrent: holidaysCurrent,
  };
};

const getAssignmentInfos = async (
  assignment: ShiftsAssignment,
  absences: ShiftsAbsence[],
  publicHolidaRruleSet: RRuleSet,
  mship: number,
) => {
  const now = getCurrentDate();

  const filteredAbsences = absences.filter(
    (absence) =>
      absence.shifts_assignment == assignment.id ||
      absence.shifts_assignment == null,
  );

  const [assignmentRule, absencesRule] = getAssignmentRRule(
    assignment,
    filteredAbsences,
    publicHolidaRruleSet,
  );

  const nextOccurence = assignmentRule.after(now, true);
  let secondNextOccurence = null;
  let nextOccurrenceAbsent = null;
  const coworkers = [];

  if (nextOccurence) {
    secondNextOccurence = assignmentRule.after(nextOccurence);

    const coworkers_ = await getCoworkers(assignment, nextOccurence, mship);
    console.log("coworkers_", coworkers_);
    coworkers.push(...coworkers_);

    if (absencesRule) {
      nextOccurrenceAbsent = absencesRule.after(nextOccurence, true) != null;
    }
  }

  return {
    assignment: assignment,
    coworkers: coworkers,
    nextOccurrence: nextOccurence,
    nextOccurrenceAbsent: nextOccurrenceAbsent,
    isRegular: secondNextOccurence != null,
  };
};

// Get names of coworkers for a shift assignment
const getCoworkers = async (
  assignment: ShiftsAssignment,
  nextOccurence: Date,
  mship: number,
) => {
  const coworkers = [];
  const occs = await getShiftOccurrences(
    nextOccurence,
    nextOccurence,
    false,
    assignment.shifts_shift.id,
    mship,
  );

  if (occs.occurrences.length > 0) {
    const assignments = occs.occurrences[0].assignments;
    for (const a of assignments) {
      const u = a.assignment.shifts_membership.memberships_user;
      if (a.isSelf) continue;
      if (!a.isActive) continue;
      coworkers.push(u.first_name + " " + u.last_name);
    }
  }

  return coworkers;
};

// Get assignment rrule
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
  if (shift.exclude_public_holidays) {
    assignmentRule.exrule(publicHolidayDates as RRule);
  }

  return [assignmentRule, absencesRule];
};
