import { DateTime } from "luxon";

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

export function getDateTimeWithTimeSpanString(
  shift: ShiftsShift,
  occurence: string,
  locale: string,
  t: any,
) {
  const occ = DateTime.fromISO(occurence, { locale: locale });
  const weekday = occ.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
  const startTime = shift.shifts_from_time?.slice(0, 5);
  const endTime = shift.shifts_to_time?.slice(0, 5);

  if (!startTime || !endTime) {
    return weekday;
  }

  return `${weekday} ${t("from")} ${startTime} ${t("to")} ${endTime}`;
}

export function getDateSpanString(
  from: string,
  to: string,
  locale: string,
  t: any,
) {
  const fromDate = DateTime.fromISO(from, { locale: locale });
  const toDate = DateTime.fromISO(to, { locale: locale });
  const fromWeekDay = fromDate.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
  const toWeekDay = toDate.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);

  return `${fromWeekDay} ${t("to")} ${toWeekDay}`;
}
