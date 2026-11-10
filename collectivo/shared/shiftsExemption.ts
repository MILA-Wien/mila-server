/**
 * Whether a time-limited exemption is over once the nightly cronjob has processed
 * `processedDay`. "Befreit bis" is inclusive: the member is exempt for the whole of that
 * day and returns to Festschicht from the following day on. The cronjob processes past
 * days, so the run on 1 January processes 31 December: that is when a member exempt
 * "bis 31.12." is switched back, after that day was already skipped for the decrement.
 *
 * Dates are compared as `YYYY-MM-DD` strings, which order correctly and avoid timezones.
 */
export function hasExemptionEnded({
  shiftsUserType,
  exemptUntil,
  processedDay,
}: {
  shiftsUserType: string;
  exemptUntil: string | null | undefined;
  processedDay: string;
}): boolean {
  // A date on a member who is not exempt means nothing and is left alone (see #237).
  if (shiftsUserType !== "exempt" || !exemptUntil) return false;
  return processedDay >= exemptUntil;
}

/**
 * "Befreit bis" as members read it, e.g. `2026-12-31` -> `31.12.2026`. Used both in the
 * member area and as the `exempt_until` variable of the exemption-ended email. Works on
 * the plain date string so no timezone can shift the day.
 */
export function formatExemptUntil(exemptUntil: string): string {
  const [year, month, day] = exemptUntil.split("-");
  return `${day}.${month}.${year}`;
}
