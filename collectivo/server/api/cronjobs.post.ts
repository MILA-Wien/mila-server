// Runs once a day at 03:00 in the morning, called by directus API
// Only runs cronjob for past days since last successful cronjob

import {
  createItem,
  readItems,
  readSingleton,
  updateItem,
  updateSingleton,
} from "@directus/sdk";
import { getShiftOccurrences } from "~/server/utils/shiftsOccurrences";
import { sendShiftReminders } from "../utils/shiftsReminder";

const CYCLE_DAYS = 28;

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
  const directus = await useDirectusAdmin();
  const settings = await directus.request(readSingleton("settings_hidden"));

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
    const holidays = await getActiveHolidays(day);

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
  await directus.request(
    updateSingleton("settings_hidden", {
      last_cronjob: new Date().toISOString(),
    }),
  );
}

async function getActiveHolidays(date: Date): Promise<number[]> {
  const directus = await useDirectusAdmin();
  const holidays = await directus.request(
    readItems("shifts_absences", {
      filter: {
        shifts_is_holiday: { _eq: true },
        shifts_to: { _gte: date.toISOString() },
        shifts_from: { _lte: date.toISOString() },
      },
      fields: ["id", "shifts_membership"],
    }),
  );

  return holidays.map((holiday) => holiday.shifts_membership as number);
}

// Decrement shifts counter for all users that
// 1) are not on holiday
// 2) are active as well as jumpers or regulars
// 3) have a shifts counter > 0 (if counter hits zero, it remains at zero)
async function decrement_shifts_counter(mshipIdsOnHoliday: number[]) {
  const directus = await useDirectusAdmin();
  const memberships = await directus.request(
    readItems("memberships", {
      filter: {
        memberships_type: {
          _eq: "Aktiv",
        },
        shifts_user_type: {
          _in: ["jumper", "regular"],
        },
      },
      fields: ["id", "shifts_counter"],
    }),
  );
  const membershipsToUpdate = memberships.filter(
    (membership) => !mshipIdsOnHoliday.includes(membership.id),
  );

  for (const membership of membershipsToUpdate) {
    if (membership.shifts_counter < 0) continue;
    await directus.request(
      updateItem("memberships", membership.id, {
        shifts_counter: membership.shifts_counter - 1,
      }),
    );
  }
}

// Create shift logs for a specific day
// Since chronjobs only run for past days, no logs are created for the current or future day
async function create_shift_logs(
  day: Date,
  mshipIdsOnHoliday: number[],
  settings: SettingsHidden,
) {
  const directus = await useDirectusAdmin();

  const { occurrences } = await getShiftOccurrences(day, day, true);

  const logs = await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_date: {
          _gte: day.toISOString(),
          _lte: day.toISOString(),
        },
      },
    }),
  );

  for (const occurrence of occurrences) {
    const occDate = occurrence.start.toISOString().split("T")[0];
    for (const ass of occurrence.assignments) {
      const mship = ass.assignment.shifts_membership as MembershipsMembership;

      // Skip if assignment inactive, user on holiday, or log already exists
      if (
        !ass.isActive ||
        mshipIdsOnHoliday.includes(mship.id) ||
        logs.some(
          (log) =>
            mship.id === log.shifts_membership && occDate === log.shifts_date,
        )
      ) {
        continue;
      }

      // Create a log entry, assuming that shift has been attended
      await directus.request(
        createItem("shifts_logs", {
          shifts_membership: mship.id,
          shifts_date: occDate,
          shifts_type: "attended",
          shifts_score: settings.shift_point_system ? CYCLE_DAYS : 0,
          shifts_shift: occurrence.shift.id,
        }),
      );
    }
  }
}
