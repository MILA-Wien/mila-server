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
