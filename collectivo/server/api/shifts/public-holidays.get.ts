import { readItems } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  getUserOrThrowError(event);

  const directus = useDirectusAdmin();
  const today = getCurrentDate();

  const data = await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          // @ts-expect-error directus date filter
          _and: [{ _gte: today.toISOString() }],
        },
      },
      limit: -1,
      fields: ["date"],
    }),
  );

  return data.map((holiday) => holiday.date);
});
