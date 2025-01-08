/*
 * This endpoint handles sending reminders for shift assignments.
 * It is called by a directus cron job.
 * It sends reminders to users for shifts that lie 2 days in the future.
 * Requires an active automation with the name "shifts_reminder".
 * Request requires collectivo api token.
 */
import { createItem, readItems, updateItems } from "@directus/sdk";
import { RRule, RRuleSet } from "rrule";

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  const automation = await getAutomation("shifts_reminder");
  const assignments = await getAssignments();
  await sendReminders(assignments, automation);
});

async function getAssignments() {
  const directus = useDirectusAdmin();
  const targetDate = getFutureDate(2);
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
        "send_reminders",
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

  // Get public holidays within timeframe
  const publicHolidays = (await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          _and: [{ _gte: targetDate }, { _lte: targetDate }],
        },
      },
      limit: -1,
      fields: ["*"],
    }),
  )) as ShiftsPublicHoliday[];

  const assignmentRules: AssignmentRrule[] = [];

  for (const shift of shifts) {
    const shiftRule = getShiftRrule(shift, publicHolidays);

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

  return occurrences;
}

async function getAutomation(name: string) {
  const directus = await useDirectusAdmin();
  const automations = await directus.request(
    readItems("mila_automations", {
      filter: {
        mila_key: {
          _eq: name,
        },
      },
    }),
  );

  if (!automations.length) {
    throw new Error("Automation not found");
  }

  const automation = automations[0];

  if (!automation.mila_active) {
    throw new Error("Automation is not active");
  }

  return automation;
}

async function sendReminders(occurrences: any[], automation: any) {
  const directus = await useDirectusAdmin();
  const payloads: any[] = [];

  for (const occ of occurrences) {
    const assignment = occ.assignment.assignment;

    if (!assignment.send_reminders) {
      continue;
    }

    const user = assignment.shifts_membership.memberships_user;
    const shift = occ.assignment.shift!;

    const context = {
      shift_date: occ.date.toISOString().split("T")[0],
      shift_time_start: shift.shifts_from_time?.slice(0, -3),
      shift_time_end: shift.shifts_to_time?.slice(0, -3),
      shift_description: "markdown:" + shift.shifts_description,
    };

    payloads.push([
      {
        messages_recipients: {
          create: [
            {
              directus_users_id: {
                id: user.id,
              },
              messages_campaigns_id: "+",
            },
          ],
        },
        messages_context: context,
        messages_template: automation.mila_template,
      },
    ]);
  }

  const campaign_ids = [];

  for (const payload of payloads) {
    const campaign = await directus.request(
      createItem("messages_campaigns", payload, { fields: ["id"] }),
    );

    campaign_ids.push(campaign[0].id);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (!campaign_ids.length) {
    return;
  }

  await directus.request(
    updateItems("messages_campaigns", campaign_ids, {
      messages_campaign_status: "pending",
    }),
  );
}

// Create a RRule object for a shift
// Shifts without end date run forever
// Shifts without repetition run once
// Dates are with T=00:00:00 UTC
export const getShiftRrule = (
  shift: ShiftsShift,
  publicHolidays?: ShiftsPublicHoliday[],
): RRule => {
  const rruleSet = new RRuleSet();

  const mainShiftRule = new RRule({
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

  rruleSet.rrule(mainShiftRule);

  // Exclude public holidays
  if (shift.exclude_public_holidays) {
    for (const holiday of publicHolidays ?? []) {
      const holidayRule = new RRule({
        freq: RRule.DAILY,
        interval: 1,
        dtstart: new Date(holiday.date),
        until: new Date(holiday.date),
      });
      rruleSet.exrule(holidayRule);
    }
  }
  return rruleSet;
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
      shift: shift,
      assignment: assignment,
      absences: filteredAbsences,
      rrule: assRrule,
      rruleWithAbsences: assRruleWithAbs,
    });
  }

  return assignmentRules;
};
