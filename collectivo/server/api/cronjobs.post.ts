// Runs once a day at 03:00 in the morning, called by directus API
// Only runs cronjob for past days since last successful cronjob

import { sendShiftReminders } from "../utils/shiftsReminder";

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  console.log("Running cronjobs");
  const query = getQuery(event);
  const force_yesterday = query.force_yesterday === "true";
  try {
    await runCronjobs(force_yesterday);
  } catch (e) {
    console.error("Error in cronjobs", e);
  }
  console.log("Finished cronjobs");
});

async function runCronjobs(force_yesterday: boolean) {
  const settings = await dbGetSettings();

  // Get days since last cronjob (including day of last cronjob, not including current day)
  const from = new Date(settings.last_cronjob + "Z");
  if (force_yesterday) {
    // If repeat is true, run cronjobs for the last day
    from.setDate(new Date().getDate() - 1);
  }
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date();
  to.setDate(to.getDate() - 1); // Run until yesterday, exclude today
  const days_since_last_cronjob = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    days_since_last_cronjob.push(new Date(d));
  }

  // Perform cronjobs
  for (const day of days_since_last_cronjob) {
    const holidays = await dbGetActiveHolidayMemberships(day);

    // Job 1
    await create_shift_logs(day, holidays, settings);

    // Job 2
    try {
      await sendShiftReminders(day);
    } catch (e) {
      console.error("Error in sendShiftReminders", e);
    }

    // Job 3
    if (settings.shift_point_system) {
      await decrement_shifts_counter(holidays);
    }
  }

  // Update last cronjob timestamp
  await dbUpdateSettings({ last_cronjob: new Date().toISOString() });
}

// Decrement shifts counter for all users that
// 1) are not on holiday
// 2) are active as well as jumpers or regulars
// 3) have a shifts counter > 0 (if counter hits zero, it remains at zero)
async function decrement_shifts_counter(mshipIdsOnHoliday: number[]) {
  const memberships = await dbGetMembershipsForDecrement();
  const membershipsToUpdate = memberships.filter(
    (membership) => !mshipIdsOnHoliday.includes(membership.id),
  );

  for (const membership of membershipsToUpdate) {
    if (membership.shifts_counter < -28) continue;
    await dbDecrementMembershipCounter(membership.id, membership.shifts_counter);
  }
}

// Create shift logs for a specific day
// Since chronjobs only run for past days, no logs are created for the current or future day
async function create_shift_logs(
  day: Date,
  mshipIdsOnHoliday: number[],
  settings: SettingsHidden,
) {
  const { occurrences } = await getShiftOccurrencesForApi(day, day, true);
  const logs = await dbGetShiftLogsByDate(day);

  for (const occurrence of occurrences) {
    const occDate = occurrence.start.split("T")[0];
    for (const ass of occurrence.assignments) {
      // Skip if assignment inactive, user on holiday, or log already exists
      if (
        !ass.isActive ||
        mshipIdsOnHoliday.includes(ass.membershipId) ||
        logs.some(
          (log) =>
            ass.membershipId === log.shifts_membership && occDate === log.shifts_date,
        )
      ) {
        continue;
      }

      // Create a log entry, assuming that shift has been attended
      const score = settings.shift_point_system
        ? (occurrence.shift as any).shift_points
        : 0;
      await dbCreateShiftLog(
        "attended",
        ass.membershipId,
        occDate,
        occurrence.shift.id,
        score,
      );
    }
  }
}
