/*
 * This function handles sending reminders for shift assignments.
 * It is called by a directus cron job.
 * It sends reminders to users for shifts that lie 2 days in the future.
 * Requires an active automation with the name "shifts_reminder".
 */

export async function sendShiftReminders(date: Date) {
  const automation = await dbGetAutomation("shifts_reminder");

  if (!automation) {
    throw new Error("Automation not found");
  }

  if (!automation.mila_active) {
    throw new Error("Automation is not active");
  }

  const assignments = await getAssignmentsInTwoDays(date);
  await sendRemindersInner(assignments, automation);
}

async function getAssignmentsInTwoDays(date: Date) {
  const targetDate = new Date(date);
  targetDate.setDate(targetDate.getDate() + 3);
  console.log("Sending reminders for shifts on ", targetDate.toISOString());
  const shifts = (await dbGetShifts(
    targetDate,
    targetDate,
    undefined,
    true,
  )) as ShiftsShift[];

  const shiftIds = shifts.map((shift) => shift.id);

  // Get assignments two days ahead
  const assignments = await dbGetAssignmentsWithNotifications(
    shiftIds,
    targetDate,
    targetDate,
  );

  const assignmentIds = assignments.map((assignment) => assignment.id);

  const absences = [];
  if (assignmentIds.length) {
    const absences_ = await dbGetAbsences(
      assignmentIds,
      targetDate,
      targetDate,
    );
    absences.push(...absences_);
  }

  const publicHolidays = await dbGetPublicHolidays(targetDate, targetDate);

  const holidayRrule = await getFutureHolidayRrule();

  const assignmentRules: AssignmentRrule[] = [];

  for (const shift of shifts) {
    const shiftRule = getShiftRrule(shift, publicHolidays);

    const filteredAssignments = assignments.filter(
      (assignment) => assignment.shifts_shift === shift.id,
    );

    const rules = getAssignmentRrules(
      shift,
      shiftRule,
      filteredAssignments as ShiftsAssignment[],
      absences as ShiftsAbsence[],
    );

    assignmentRules.push(...rules);
  }

  const occurrences = [];

  for (const rule of assignmentRules) {
    const occs = rule.rruleWithAbsences.between(targetDate, targetDate, true);

    for (const occ of occs) {
      if (
        holidayRrule.between(occ, occ, true).length > 0 &&
        rule.shift.exclude_public_holidays == true
      ) {
        continue;
      }

      occurrences.push({
        assignment: rule,
        date: occ,
      });
    }
  }

  return occurrences;
}

async function sendRemindersInner(occurrences: any[], automation: any) {
  const payloads: any[] = [];

  for (const occ of occurrences) {
    const assignment = occ.assignment.assignment;

    try {
      if (
        assignment.shifts_membership.memberships_user.send_notifications ===
        false
      ) {
        continue;
      }
    } catch (error) {
      console.error(`Error checking send_notifications for assignment`, error);
    }

    const user = assignment.shifts_membership.memberships_user;
    const shift = occ.assignment.shift!;
    console.log(shift);
    const context = {
      shift_date: occ.date.toISOString().split("T")[0],
      shift_time_start: shift.shifts_from_time?.slice(0, -3),
      shift_time_end: shift.shifts_to_time?.slice(0, -3),
      shift_description: "markdown:" + shift.shifts_description,
      shift_category: shift.shifts_category_2?.name,
      shift_category_description:
        "markdown:" + shift.shifts_category_2?.beschreibung,
    };

    console.log(context);

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
    const campaign = (await dbCreateCampaign(payload)) as any;
    campaign_ids.push(campaign[0].id);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (!campaign_ids.length) {
    return;
  }

  await dbSetCampaignsPending(campaign_ids);
}
