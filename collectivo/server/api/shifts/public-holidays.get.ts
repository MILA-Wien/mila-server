export default defineEventHandler(async (event) => {
  getUserOrThrowError(event);
  const holidays = await dbGetFuturePublicHolidays();
  return holidays.map((holiday) => holiday.date);
});
