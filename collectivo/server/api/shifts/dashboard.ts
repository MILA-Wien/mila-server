// Get overview of shifts for current user
// Includes shifts, assignments, absences, holidays, logs

import { RRule, RRuleSet } from "rrule";
import { readItems } from "@directus/sdk";
import {
  createAssignmentRrule,
  getFutureHolidayRrule,
} from "../../utils/shiftsQueries";

export default defineEventHandler(async (event) => {
  return await getShiftDataDashboard(event.context.auth.mship);
});

const getShiftDataDashboard = async (mship: number) => {
  const [
    assignments,
    [absences, signouts, holidays, holidaysCurrent],
    holidayRrule,
    logs,
  ] = await Promise.all([
    getAssignments(mship),
    getAbsences(mship),
    getFutureHolidayRrule(),
    getLogs(mship),
  ]);

  const assignmentInfos = await Promise.all(
    assignments.map(async (assignment) => {
      return await getAssignmentInfos(
        assignment,
        absences,
        holidayRrule,
        mship,
      );
    }),
  );

  const activeAssignments = assignmentInfos.filter(
    (info) => info.occurrences.length > 0,
  );

  activeAssignments.sort((a, b) => {
    const nextA = a.occurrences[0]?.date;
    const nextB = b.occurrences[0]?.date;
    if (!nextA && !nextB) return 0;
    if (!nextA) return 1;
    if (!nextB) return -1;
    if (nextA == nextB) return 0;
    return nextA > nextB ? 1 : -1;
  });

  return {
    assignments: activeAssignments,
    signouts: signouts,
    holidays: holidays,
    holidaysCurrent: holidaysCurrent,
    logs: logs,
  };
};

async function getAssignments(mship: number) {
  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const directus = useDirectusAdmin();
  return await directus.request(
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
          shifts_membership: [
            {
              memberships_user: ["username", "username_last", "hide_name"],
            },
            "shifts_can_be_coordinator",
          ],
        },
      ],
    }),
  );
}

async function getAbsences(mship: number) {
  const directus = useDirectusAdmin();
  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const absences = await directus.request(
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
              memberships_user: ["username", "username_last", "hide_name"],
            },
            "shifts_can_be_coordinator",
          ],
        },
      ],
    }),
  );

  const holidays = [];
  const signouts = [];
  const holidaysCurrent = [];
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

interface OccurrenceInfo {
  date: Date;
  isHoliday: boolean;
  isPublicHoliday: boolean;
  isOtherAbsence: boolean;
  isActive: boolean;
}

function getOccurrenceInfo(occ: Date, hr: RRule, oar: RRule, phr?: RRule) {
  const isHoliday = hr.between(occ, occ, true).length > 0;
  const isPublicHoliday = phr ? phr.between(occ, occ, true).length > 0 : false;
  const isOtherAbsence = oar.between(occ, occ, true).length > 0;
  return {
    date: new Date(occ),
    isHoliday: isHoliday,
    isPublicHoliday: isPublicHoliday,
    isOtherAbsence: isOtherAbsence,
    isActive: !(isHoliday || isPublicHoliday || isOtherAbsence),
  };
}

const getAssignmentInfos = async (
  assignment: Awaited<ReturnType<typeof getAssignments>>[number],
  absences: Awaited<ReturnType<typeof getAbsences>>[number][],
  holidayRrule: RRuleSet,
  mship: number,
) => {
  const now = getCurrentDate();

  const filteredAbsences = absences.filter(
    (absence) =>
      absence.shifts_assignment == null ||
      absence.shifts_assignment.id == assignment.id,
  );

  const { assignmentRule, holidayRule, otherAbsencesRule } = getRules(
    assignment,
    filteredAbsences,
  );

  const excludePublicHolidays = assignment.shifts_shift.exclude_public_holidays;

  // Get the next 4 occurrences
  const occurrences: OccurrenceInfo[] = [];
  let currentDate: Date | null = null;
  for (let i = 0; i < 4; i++) {
    if (i == 0) {
      currentDate = assignmentRule.after(now, true);
    } else {
      if (!currentDate) break;
      currentDate = assignmentRule.after(currentDate, false);
    }
    if (currentDate) {
      occurrences.push(
        getOccurrenceInfo(
          currentDate,
          holidayRule,
          otherAbsencesRule,
          excludePublicHolidays ? holidayRrule : undefined,
        ),
      );
    }
  }

  const coworkers = [];
  const coordinators = [];

  if (occurrences.length > 0) {
    const [coworkers_, coordinators_] = await getShiftTeam(
      assignment,
      occurrences[0].date,
      mship,
    );
    coworkers.push(...coworkers_);
    coordinators.push(...coordinators_);
  }

  return {
    assignment: assignment,
    coworkers: coworkers,
    coordinators: coordinators,
    occurrences: occurrences,
    isRegular: occurrences.length > 1,
  };
};

const getShiftTeam = async (
  assignment: any,
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
        coordinators.push(u.username + " " + u.username_last);
      } else {
        coworkers.push(u.username + " " + u.username_last);
      }
    }
  }

  return [coworkers, coordinators];
};

export const getRules = (assignment: any, absences?: ShiftsAbsence[]) => {
  const shift = assignment.shifts_shift;
  const shiftRule = getShiftRrule(shift);

  const assignmentRule = createAssignmentRrule(
    assignment.shifts_from,
    assignment.shifts_to,
    shift.shifts_repeats_every,
    assignment.shifts_is_regular,
    shiftRule,
  );

  const holidayRule = new RRuleSet();
  const otherAbsencesRule = new RRuleSet();
  absences?.forEach((absence) => {
    const rule = new RRule({
      freq: RRule.DAILY,
      interval: 1,
      dtstart: parseUtcMidnight(absence.shifts_from),
      until: parseUtcMidnight(absence.shifts_to),
    });
    if (absence.shifts_is_holiday) {
      holidayRule.rrule(rule);
    } else {
      otherAbsencesRule.rrule(rule);
    }
  });

  return { assignmentRule, holidayRule, otherAbsencesRule };
};
