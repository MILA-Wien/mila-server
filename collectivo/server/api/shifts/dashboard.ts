// Get overview of shifts for current user
// Includes shifts, assignments, absences, holidays, logs

import { RRule, RRuleSet } from "rrule";
import {
  createAssignmentRrule,
  getFutureHolidayRrule,
} from "../../utils/shiftsRrules";

export default defineEventHandler(async (event) => {
  return await getShiftDataDashboard(event.context.auth.mship);
});

const getShiftDataDashboard = async (mship: number) => {
  const [assignments, absences, holidayRrule, logs] = await Promise.all([
    dbGetDashboardAssignments(mship),
    dbGetDashboardAbsences(mship),
    getFutureHolidayRrule(),
    dbGetDashboardLogs(mship),
  ]);

  // Categorize absences
  const now = getCurrentDate();
  const holidays = [];
  const signouts = [];
  const holidaysCurrent = [];
  for (const absence of absences) {
    if (absence.shifts_is_holiday) {
      holidays.push(absence);
      if (new Date(absence.shifts_from) <= now) {
        holidaysCurrent.push(absence);
      }
    } else {
      signouts.push(absence);
    }
  }

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
    signouts,
    holidays,
    holidaysCurrent,
    logs,
  };
};

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
    isHoliday,
    isPublicHoliday,
    isOtherAbsence,
    isActive: !(isHoliday || isPublicHoliday || isOtherAbsence),
  };
}

const getAssignmentInfos = async (
  assignment: Awaited<ReturnType<typeof dbGetDashboardAssignments>>[number],
  absences: Awaited<ReturnType<typeof dbGetDashboardAbsences>>,
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

  const team: string[] = [];

  if (occurrences.length > 0) {
    const team_ = await getShiftTeam(
      assignment,
      occurrences[0].date,
      mship,
    );
    team.push(...team_);
  }

  return {
    assignment,
    team,
    occurrences,
    isRegular: occurrences.length > 1,
  };
};

const getShiftTeam = async (
  assignment: any,
  nextOccurence: Date,
  mship: number,
): Promise<string[]> => {
  const team: string[] = [];
  const occs = await getShiftOccurrencesForApi(
    nextOccurence,
    nextOccurence,
    false,
    assignment.shifts_shift.id,
    mship,
  );

  if (occs.occurrences.length > 0) {
    for (const a of occs.occurrences[0].assignments) {
      if (!a.isActive) continue;
      const name = a.username === "" ? "" : `${a.username} ${a.username_last}`;
      const icons = a.skills
        .map((s) => s.icon)
        .join("");
      team.push(name + icons);
    }
  }

  return team;
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
