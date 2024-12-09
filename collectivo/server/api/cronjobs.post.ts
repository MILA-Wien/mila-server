import {
  createItem,
  readItems,
  readSingleton,
  updateSingleton,
} from "@directus/sdk";
import { getShiftOccurrences } from "~/server/utils/shiftsOccurrences";

// Runs every 10 minutes, called by directus API
// Only runs cronjob in interval since last successful cronjob

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  try {
    await runCronjobs();
  } catch (e) {
    console.error(e);
  }
});

async function runCronjobs() {
  const directus = await useDirectusAdmin();
  const settings = await directus.request(readSingleton("settings_hidden"));

  const from = new Date(settings.last_cronjob + "Z");
  const to = new Date();

  create_shift_logs(from, to);

  // Update last cronjob timestamp
  await directus.request(
    updateSingleton("settings_hidden", {
      last_cronjob: new Date().toISOString(),
    }),
  );
}

async function create_shift_logs(from: Date, to: Date) {
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
      const mship = ass.assignment.shifts_membership.id;
      if (
        ass.isActive &&
        !logs.some(
          (log) =>
            mship === log.shifts_membership && occDate === log.shifts_date,
        )
      ) {
        // Log does not exist -> create
        console.log("CREATING LOG");
        directus.request(
          createItem("shifts_logs", {
            shifts_membership: mship,
            shifts_date: occDate,
            shifts_type: "attended_draft",
            shifts_score: 1,
            shifts_shift: occurrence.shift.id,
          }),
        );
      }
    }
  }
}
