import {
  createItem,
  readItems,
  readSingleton,
  updateItem,
  updateSingleton,
} from "@directus/sdk";
import { getShiftOccurrences } from "~/server/utils/shiftsOccurrences";
import { sendShiftReminders } from "../utils/shiftsReminder";

// Runs once a day, called by directus API
// Only runs cronjob in interval since last successful cronjob

const CYCLE_DAYS = 28;

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  console.log("Running cronjobs");
  try {
    await runCronjobs();
  } catch (e) {
    console.error("Error in cronjobs", e);
  }
  console.log("Finished cronjobs");
});

async function runCronjobs() {
  const directus = await useDirectusAdmin();
  const settings = await directus.request(readSingleton("settings_hidden"));

  // Get days since last cronjob (do not include day of last cronjob)
  const from = new Date(settings.last_cronjob + "Z");
  from.setDate(from.getDate() + 1);
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date();
  const days_since_last_cronjob = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    days_since_last_cronjob.push(new Date(d));
  }

  // Perform cronjobs
  for (const date of days_since_last_cronjob) {
    const holidays = await getActiveHolidays(date);

    // Job 1
    await create_shift_logs(date, date, holidays, settings);

    // Job 2
    try {
      await sendShiftReminders(date);
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
async function create_shift_logs(
  from: Date,
  to: Date,
  mshipIdsOnHoliday: number[],
  settings: SettingsHidden,
) {
  const directus = await useDirectusAdmin();

  const { occurrences } = await getShiftOccurrences(from, to, true);

  const logs = await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_date: {
          _gte: from.toISOString(),
          _lte: to.toISOString(),
        },
      },
    }),
  );

  for (const occurrence of occurrences) {
    const occDate = occurrence.start.toISOString().split("T")[0];
    for (const ass of occurrence.assignments) {
      const mship = ass.assignment.shifts_membership as MembershipsMembership;

      if (
        logs.some(
          (log) =>
            mship.id === log.shifts_membership && occDate === log.shifts_date,
        )
      ) {
        continue;
      }
      if (!ass.isActive) continue;
      if (mshipIdsOnHoliday.includes(mship.id)) continue;

      // Log does not exist -> create
      await directus.request(
        createItem("shifts_logs", {
          shifts_membership: mship.id,
          shifts_date: occDate,
          shifts_type: "attended_draft",
          shifts_score: settings.shift_point_system ? CYCLE_DAYS : 0,
          shifts_shift: occurrence.shift.id,
        }),
      );
    }
  }
}
