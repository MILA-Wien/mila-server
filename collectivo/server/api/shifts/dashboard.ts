// Get overview of shifts for current user
// Includes shifts, assignments, absences, holidays, logs

import { RRule, RRuleSet } from "rrule";
import { readItems } from "@directus/sdk";
import { createAssignmentRrule } from "~/server/utils/shiftsQueries";

export default defineEventHandler(async (event) => {
  return await getShiftDataUser(event.context.auth.mship);
});

const getShiftDataUser = async (mship: number) => {
  const [
    assignments,
    [absences, signouts, holidays, holidaysCurrent],
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
    signouts: signouts,
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
            "shifts_can_be_coordinator",
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
        { shifts_assignment: ["id", { shifts_shift: ["shifts_name"] }] },
        {
          shifts_membership: [
            {
              memberships_user: ["first_name", "last_name"],
            },
            "shifts_can_be_coordinator",
          ],
        },
      ],
    }),
  )) as ShiftsAbsenceDashboard[];

  const holidays = [] as ShiftsAbsenceDashboard[];
  const signouts = [] as ShiftsAbsenceDashboard[];
  const holidaysCurrent = [] as ShiftsAbsenceDashboard[];
  for (const absence of absences) {
    if (absence.shifts_is_holiday) {
      holidays.push(absence);
      if (new Date(absence.shifts_from) <= new Date(nowStr)) {
        holidaysCurrent.push(absence);
      }
    } else {
      signouts.push(absence);
    }
  }

  return [absences, signouts, holidays, holidaysCurrent];
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
  absences: ShiftsAbsenceDashboard[],
  publicHolidaRruleSet: RRuleSet,
  mship: number,
) => {
  const now = getCurrentDate();

  const filteredAbsences = absences.filter(
    (absence) =>
      absence.shifts_assignment == null ||
      absence.shifts_assignment.id == assignment.id,
  );

  const assignmentRuleWithAbsences = getAssignmentRRule(
    assignment,
    filteredAbsences,
    publicHolidaRruleSet,
  );

  const nextOccurrence = assignmentRuleWithAbsences.after(now, true);

  let secondNextOccurence = null;
  const coworkers = [];
  const coordinators = [];

  if (nextOccurrence) {
    secondNextOccurence = assignmentRuleWithAbsences.after(nextOccurrence);
    const [coworkers_, coordinators_] = await getCoworkers(
      assignment,
      nextOccurrence,
      mship,
    );
    coworkers.push(...coworkers_);
    coordinators.push(...coordinators_);
  }

  return {
    assignment: assignment,
    coworkers: coworkers,
    coordinators: coordinators,
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
  const coordinators = [];
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
      if (a.assignment.shifts_membership.shifts_can_be_coordinator) {
        coordinators.push(u.first_name + " " + u.last_name);
      } else {
        coworkers.push(u.first_name + " " + u.last_name);
      }
    }
  }

  return [coworkers, coordinators];
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

  // Assignment rule
  assignmentRule.rrule(
    createAssignmentRrule(
      assignment.shifts_from,
      assignment.shifts_to,
      shift.shifts_repeats_every,
      assignment.shifts_is_regular,
      shiftRule,
    ),
  );

  // Absence rules
  absences?.forEach((absence) => {
    const absenceRule = new RRule({
      freq: RRule.DAILY,
      interval: 1,
      dtstart: parseUtcMidnight(absence.shifts_from),
      until: parseUtcMidnight(absence.shifts_to),
    });

    assignmentRule.exrule(absenceRule);
  });

  // Exclude public holidays
  if (shift.exclude_public_holidays) {
    assignmentRule.exrule(publicHolidayDates as RRule);
  }

  return assignmentRule;
};
