// Get overview of shifts for current user
// Includes shifts, assignments, absences, holidays, logs

import { RRule, RRuleSet } from "rrule";
import { readItems } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  return await getShiftDataUser(event.context.auth.mship);
});

const getShiftDataUser = async (mship: number) => {
  const [
    assignments,
    [absences, holidays, holidaysCurrent],
    publicHolidaRruleSet,
    logs,
  ] = await Promise.all([
    getAssignments(mship),
    getAbsences(mship),
    getPublicHolidays(),
    getLogs(mship),
  ]);

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
    assignments: assignmentInfos.filter((rule) => rule.nextOccurrence),
    absences: absences,
    holidays: holidays,
    holidaysCurrent: holidaysCurrent,
    logs: logs,
  } as ShiftsDashboard;
};

async function getAssignments(mship: number) {
  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const directus = useDirectusAdmin();
  return (await directus.request(
    readItems("shifts_assignments", {
      filter: {
        shifts_membership: { id: { _eq: mship } },
        shifts_to: {
          // @ts-expect-error directus date filter bug
          _or: [{ _gte: nowStr }, { _null: true }],
        },
      },
      limit: -1,
      fields: [
        "*",
        { shifts_shift: ["*"] },
        {
          shifts_membership: [
            {
              memberships_user: ["first_name", "last_name"],
            },
          ],
        },
      ],
    }),
  )) as ShiftsAssignmentDashboard[];
}

async function getAbsences(mship: number) {
  const directus = useDirectusAdmin();
  const now = getCurrentDate();
  const nowStr = now.toISOString();
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
        { shifts_assignment: [{ shifts_shift: ["shifts_name"] }] },
        {
          shifts_membership: [
            {
              memberships_user: ["first_name", "last_name"],
            },
          ],
        },
      ],
    }),
  )) as ShiftsAbsenceDashboard[];

  const holidays = [] as ShiftsAbsenceDashboard[];
  const remainingAbsences = [] as ShiftsAbsenceDashboard[];
  const holidaysCurrent = [] as ShiftsAbsenceDashboard[];
  for (const absence of absences) {
    if (absence.shifts_is_holiday) {
      holidays.push(absence);
      if (new Date(absence.shifts_from) <= new Date(nowStr)) {
        holidaysCurrent.push(absence);
      }
    } else {
      remainingAbsences.push(absence);
    }
  }

  return [remainingAbsences, holidays, holidaysCurrent];
}

async function getPublicHolidays() {
  const now = getCurrentDate();
  const directus = useDirectusAdmin();
  const publicHolidays = (await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          // @ts-expect-error directus date filter bug
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

  return publicHolidaRruleSet;
}

async function getLogs(mship: number) {
  const directus = useDirectusAdmin();
  return await directus.request(
    readItems("shifts_logs", {
      filter: { shifts_membership: mship },
      sort: ["-shifts_date"],
      limit: 5,
    }),
  );
}

const getAssignmentInfos = async (
  assignment: ShiftsAssignmentDashboard,
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

  const [assignmentRuleWithAbsences, assignmentRule, _] = getAssignmentRRule(
    assignment,
    filteredAbsences,
    publicHolidaRruleSet,
  );

  const nextOccurrence = assignmentRuleWithAbsences.after(now, true);
  let secondNextOccurence = null;
  const coworkers = [];

  if (nextOccurrence) {
    secondNextOccurence = assignmentRule.after(nextOccurrence);
    const coworkers_ = await getCoworkers(assignment, nextOccurrence, mship);
    coworkers.push(...coworkers_);
  }

  return {
    assignment: assignment,
    coworkers: coworkers,
    nextOccurrence: nextOccurrence?.toISOString(),
    secondNextOccurence: secondNextOccurence?.toISOString(),
    isRegular: secondNextOccurence != null,
  } as ShiftsOccurrenceDashboard;
};

// Get names of coworkers for a shift assignment
const getCoworkers = async (
  assignment: ShiftsAssignmentDashboard,
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
      if (!a.isActive) continue;
      coworkers.push(u.first_name + " " + u.last_name);
    }
  }

  return coworkers;
};

// Get assignment rrule
export const getAssignmentRRule = (
  assignment: ShiftsAssignmentDashboard,
  absences?: ShiftsAbsence[],
  publicHolidayDates?: RRuleSet,
) => {
  const shift = assignment.shifts_shift;

  const shiftRule = getShiftRrule(shift);

  const assignmentRule = new RRuleSet();
  const assignmentRuleWithAbsences = new RRuleSet();
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

  // Assignment rule with absences excluded
  assignmentRuleWithAbsences.rrule(
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
    assignmentRuleWithAbsences.exrule(absenceRule);
  });

  // Exclude public holidays
  if (shift.exclude_public_holidays) {
    assignmentRuleWithAbsences.exrule(publicHolidayDates as RRule);
  }

  return [assignmentRuleWithAbsences, assignmentRule, absencesRule];
};
