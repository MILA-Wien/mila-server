import { DateTime } from "luxon";

export function dateWithinTimeSpan(date: string, span: number) {
  return DateTime.fromISO(date) >= DateTime.now().plus({ days: span });
}

// Always start of the day, in UTC
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
  return new Date(currentDate.setDate(currentDate.getDate() + days));
}

// Number of calendar days a date range spans, inclusive of both the start
// and end day. E.g. 01.07.–14.07. counts as 14 days (not 13).
// Uses the UTC date parts so the result matches the server-side check, which
// receives the dates as ISO strings (see server/utils/dates.ts).
export function inclusiveDaysBetween(from: Date, to: Date) {
  const fromUtc = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const toUtc = Date.UTC(
    to.getUTCFullYear(),
    to.getUTCMonth(),
    to.getUTCDate(),
  );
  const diffDays = Math.round((toUtc - fromUtc) / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}

export function getDateString(occurence: string, locale: string) {
  const occ = DateTime.fromISO(occurence, { locale: locale });
  return occ.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
}

export function getDateTimeWithTimeSpanString(
  from: string | undefined,
  to: string | undefined,
  occurence: string,
  locale: string,
  t: any,
) {
  const occ = DateTime.fromISO(occurence, { locale: locale });
  const weekday = occ.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
  const startTime = from?.slice(0, 5);
  const endTime = to?.slice(0, 5);

  if (!startTime || !endTime) {
    return weekday;
  }

  return `${weekday} ${t("from")} ${startTime} ${t("to")} ${endTime}`;
}

export function getDateSpanString(
  from: string,
  to: string | undefined,
  locale: string,
  t: any,
) {
  const fromDate = DateTime.fromISO(from, { locale: locale });
  const fromWeekDay = fromDate.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
  if (from === to || !to) {
    return fromWeekDay;
  }
  const toDate = DateTime.fromISO(to, { locale: locale });
  const toWeekDay = toDate.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
  return `${fromWeekDay} ${t("to")} ${toWeekDay}`;
}
