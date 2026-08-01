// Runs once a day at 03:00 in the morning, called by directus API
// Only runs cronjob for past days since last successful cronjob

import { sendShiftReminders } from "../utils/shiftsReminder";
import { sendShoppingExpirationWarnings } from "../utils/shoppingExpirationWarning";

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
      await decrement_shifts_counter(holidays, day);
    }
  }
  var warning_shift_counter = -14; // send out shopping expiration warnings when shift counter is at -14
  for (const day of days_since_last_cronjob) {
    // Job 4
    try {
      await sendShoppingExpirationWarnings(warning_shift_counter);
    } catch (e) {
      console.error("Error in sendShoppingExpirationWarnings", e);
    }
    --warning_shift_counter;
  }

  // Update last cronjob timestamp
  await dbUpdateSettings({ last_cronjob: new Date().toISOString() });
}

// Decrement shifts counter for all users that
// 1) are not on holiday
// 2) are active as well as jumpers or regulars
// 3) have a shifts counter > 0 (if counter hits zero, it remains at zero)
//
// A membership is considered "frozen" once its shift counter reaches the -28
// limit (shopping is blocked at checkin at the same threshold). We record the
// date the freeze started in activation_frozen_since: set once on the transition into
// frozen state, left untouched while it stays frozen (so the daily cronjob does
// not keep moving the date), and cleared when the membership becomes un-frozen.
async function decrement_shifts_counter(mshipIdsOnHoliday: number[], day: Date) {
  const memberships = await dbGetMembershipsForDecrement();
  const membershipsToUpdate = memberships.filter(
    (membership) => !mshipIdsOnHoliday.includes(membership.id),
  );

  const dayStr = day.toISOString().split("T")[0]!;

  for (const membership of membershipsToUpdate) {
    // Decrement (existing behaviour: floor once below -28, i.e. settles at -29)
    let newCounter = membership.shifts_counter;
    if (membership.shifts_counter >= -28) {
      await dbDecrementMembershipCounter(membership.id, membership.shifts_counter);
      newCounter = membership.shifts_counter - 1;
    }

    // Manage activation_frozen_since based on the resulting counter (frozen <= -28)
    const isFrozen = newCounter <= -28;
    if (isFrozen && !membership.activation_frozen_since) {
      await dbSetMembershipFrozenSince(membership.id, dayStr);
    } else if (!isFrozen && membership.activation_frozen_since) {
      await dbSetMembershipFrozenSince(membership.id, null);
    }
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
    const occDate = occurrence.start.split("T")[0]!;
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
