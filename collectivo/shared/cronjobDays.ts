/**
 * The days (UTC midnight) a cronjob run must process: from the day of the last run
 * (inclusive) up to yesterday. Today is never processed, it is not over yet.
 *
 * `lastCronjob` is the naive UTC timestamp Directus stores in `settings_hidden`. When it
 * is missing (never run, or reset by seeding) or `forceYesterday` is set, exactly
 * yesterday is processed.
 */
export function cronjobDays({
  lastCronjob,
  forceYesterday,
  now,
}: {
  lastCronjob: string | null | undefined;
  forceYesterday: boolean;
  now: Date;
}): Date[] {
  const yesterday = new Date(now);
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const from =
    forceYesterday || !lastCronjob
      ? new Date(yesterday)
      : new Date(lastCronjob + "Z");
  from.setUTCHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (const d = from; d <= yesterday; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}
