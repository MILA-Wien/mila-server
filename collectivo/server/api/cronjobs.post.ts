import { readSingleton, updateSingleton } from "@directus/sdk";

// Runs every 10 minutes, called by directus API

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event);
  console.log("Cronjob called");
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
  // await directus.request(
  //   updateSingleton("settings_hidden", {
  //     last_cronjob: new Date().toISOString(),
  //   }),
  // );
}

function create_shift_logs(from: Date, to: Date) {
  // get all shifts from from to to
  // for each shift, create a log entry
  // if a log entry already exists, update it
  // if a log entry is missing, create it
  // if a log entry is not needed, delete it
}
