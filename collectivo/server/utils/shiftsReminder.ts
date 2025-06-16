/*
 * This function handles sending reminders for shift assignments.
 * It is called by a directus cron job.
 * It sends reminders to users for shifts that lie 2 days in the future.
 * Requires an active automation with the name "shifts_reminder".
 */
import { createItem, readItems, updateItems } from "@directus/sdk";

export async function sendShiftReminders(date: Date) {
  const automation = await getAutomation("shifts_reminder");
  const assignments = await getAssignmentsInTwoDays(date);
  await sendRemindersInner(assignments, automation);
}

async function getAssignmentsInTwoDays(date: Date) {
  const directus = useDirectusAdmin();
  const targetDate = new Date(date);
  targetDate.setDate(targetDate.getDate() + 2);
  const shifts: ShiftsShift[] = await getShiftShifts(targetDate, targetDate);
  const shiftIds = shifts.map((shift) => shift.id);

  // Get assignments two days ahead
  const assignments = await getShiftAssignments(
    shiftIds,
    targetDate,
    targetDate,
  );

  const assignmentIds = assignments.map((assignment) => assignment.id);

  const absences = [];
  if (assignmentIds.length) {
    const absences_ = await getShiftAbsences(
      assignmentIds,
      targetDate,
      targetDate,
    );
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

async function sendRemindersInner(occurrences: any[], automation: any) {
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

    if (!user.id) {
      throw new Error(`User ID is missing for assignment ${assignment.id}`);
    }

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
  console.log("Sending reminders", payloads.length);

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
