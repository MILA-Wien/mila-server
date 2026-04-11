import { readItems } from "@directus/sdk";
import type {
  OccurrencesApiResponse,
  OccurrenceAssignment,
  OccurrenceShift,
} from "../../shared/types/shifts";

function toOccurrenceShift(shift: ShiftsShift): OccurrenceShift {
  return {
    id: shift.id,
    shifts_name: shift.shifts_name,
    shifts_slots: shift.shifts_slots,
    shifts_is_regular: shift.shifts_is_regular,
    shifts_is_all_day: shift.shifts_is_all_day,
    shifts_from_time: shift.shifts_from_time,
    shifts_to_time: shift.shifts_to_time,
    shifts_description: shift.shifts_description,
    shifts_category_2: shift.shifts_category_2,
    shifts_repeats_every: shift.shifts_repeats_every,
    shifts_location: shift.shifts_location,
    exclude_public_holidays: shift.exclude_public_holidays,
  };
}

/**
 * Get shift occurrences for the API endpoint.
 * Returns explicitly structured flat response with only the data the frontend needs.
 */
export const getShiftOccurrencesForApi = async (
  from: Date,
  to: Date,
  admin: boolean = false,
  shiftID?: number,
  mship?: number,
): Promise<OccurrencesApiResponse> => {
  const shifts = await dbGetShifts(from, to, shiftID);
  const shiftIds = shifts.map((shift) => shift.id);

  const assignments = await dbGetAssignmentsForApi(shiftIds, from, to, admin);
  const assignmentIds = assignments.map((a: any) => a.id);

  // Hide names if not admin
  if (!admin) {
    for (const assignment of assignments) {
      const a = assignment as any;
      if (a.shifts_membership.memberships_user.hide_name) {
        a.shifts_membership.memberships_user.username = "";
        a.shifts_membership.memberships_user.username_last = "";
      }
    }
  }

  const absences = await dbGetAbsences(assignmentIds, from, to);
  const publicHolidays = await dbGetPublicHolidays(from, to);
  const directus = await useDirectusAdmin();
  const allSkills = await directus.request(
    readItems("shifts_skills", {
      fields: ["icon", "name_de", "name_en"],
    }),
  );

  const occurrences: {
    shift: ShiftsShift;
    start: Date;
    end: Date;
    n_assigned: number;
    selfAssigned: boolean;
    assignments: OccurrenceAssignment[];
  }[] = [];

  for (const shift of shifts) {
    const shiftAssignments = assignments.filter(
      (a: any) => a.shifts_shift === shift.id,
    );

    const shiftRule = getShiftRrule(shift, publicHolidays);
    const assignmentRrules = getAssignmentRrules(
      shift,
      shiftRule,
      shiftAssignments as any,
      absences as ShiftsAbsence[],
    );

    const dates = shiftRule.between(from, to, true);
    for (const date of dates) {
      let n_assigned = 0;
      let selfAssigned = false;
      const flatAssignments: OccurrenceAssignment[] = [];

      for (const ass of assignmentRrules) {
        if (ass.rrule.between(date, date, true).length > 0) {
          const rawAssignment = ass.assignment as any;
          const membership = rawAssignment.shifts_membership;
          const user = membership.memberships_user;

          const matchingAbsences: { id?: number; shifts_from: string; shifts_to: string }[] = [];
          for (const abs of ass.absences) {
            if (abs.rrule.between(date, date, true).length > 0) {
              matchingAbsences.push({
                id: abs.absence.id,
                shifts_from: abs.absence.shifts_from,
                shifts_to: abs.absence.shifts_to,
              });
            }
          }

          const isActive = matchingAbsences.length === 0;
          const isSelf =
            isActive &&
            mship != null &&
            membership.id === mship;

          if (isActive) {
            n_assigned += 1;
          }
          if (isSelf) {
            selfAssigned = true;
          }

          flatAssignments.push({
            assignmentId: rawAssignment.id,
            membershipId: membership.id,
            username: user.username,
            username_last: user.username_last,
            hide_name: user.hide_name,
            buddy_status: user.buddy_status,
            skills: (membership.shifts_skills ?? [])
              .map((s: any) => s.shifts_skills_id)
              .filter(Boolean),
            shifts_from: rawAssignment.shifts_from,
            shifts_to: rawAssignment.shifts_to,
            shifts_shift: rawAssignment.shifts_shift,
            shifts_is_regular: rawAssignment.shifts_is_regular,
            isActive,
            isOneTime: !rawAssignment.shifts_is_regular,
            isSelf,
            absences: matchingAbsences,
            adminData: admin
              ? {
                  email: user.email,
                  memberships_phone: user.memberships_phone,
                  shifts_assignments_count: membership.shifts_logs?.length ?? 0,
                }
              : null,
          });
        }
      }

      const dateString = date.toISOString().split("T")[0];
      const start = new Date(
        `${dateString}T${shift.shifts_from_time || "00:00:00"}Z`,
      );
      const end = new Date(
        `${dateString}T${shift.shifts_to_time || "00:00:00"}Z`,
      );

      occurrences.push({
        shift,
        start,
        end,
        n_assigned,
        selfAssigned,
        assignments: flatAssignments,
      });
    }
  }

  occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    occurrences: occurrences.map((o) => ({
      shift: toOccurrenceShift(o.shift),
      start: o.start.toISOString(),
      end: o.end.toISOString(),
      n_assigned: o.n_assigned,
      selfAssigned: o.selfAssigned,
      assignments: o.assignments,
    })),
    publicHolidays: publicHolidays.map((h) => ({ date: h.date })),
    skills: allSkills as any,
  };
};

