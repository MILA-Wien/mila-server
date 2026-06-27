// On server startup, resume any campaigns that were left pending - e.g. if the
// process was restarted (deploy/crash) mid-send. The drain derives its pacing
// from the durable record of the last sent email, so resuming never bursts:
// the first post-restart email still waits the full NUXT_EMAIL_SMTP_DELAY_MS.
//
// This is the prompt recovery trigger; the daily cronjob is an additional
// periodic safety net.

export default defineNitroPlugin(() => {
  // Delay slightly so the rest of the app (and DB connectivity) is settled
  // before the first DB query. Fire-and-forget; failures are caught inside.
  setTimeout(() => {
    try {
      kickEmailDrain();
    } catch (error) {
      console.error("Failed to resume email drain on startup:", error);
    }
  }, 5000);
});
