export function getCurrentDate() {
  const now = new Date();

  const currentDateUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
    ),
  );

  return currentDateUTC;
}

export function getFutureDate(days: number) {
  const currentDate = getCurrentDate();
  const twoDaysAhead = new Date(
    currentDate.getTime() + days * 24 * 60 * 60 * 1000,
  );
  return twoDaysAhead;
}

export function parseUtcMidnight(dateInput: string | Date) {
  const date = new Date(dateInput);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

// Number of calendar days a date range spans, inclusive of both the start
// and end day. E.g. 01.07.–14.07. counts as 14 days (not 13).
export function inclusiveDaysBetween(from: string | Date, to: string | Date) {
  const fromUtc = parseUtcMidnight(from);
  const toUtc = parseUtcMidnight(to);
  const diffDays = Math.round(
    (toUtc.getTime() - fromUtc.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffDays + 1;
}
