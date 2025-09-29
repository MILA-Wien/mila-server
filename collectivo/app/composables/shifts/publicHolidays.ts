import { readItems } from "@directus/sdk";

export function getPublicHolidays(): Promise<string[]> {
  const publicHolidays = useState("public_holidays", () => loadData());

  return publicHolidays.value;
}

async function loadData() {
  const directus = useDirectus();
  const today = getCurrentDate();
  const data = await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          _and: [{ _gte: today.toISOString() }],
        },
      },
      limit: -1,
      fields: ["date"],
    }),
  );
  return data.map((holiday) => holiday.date);
}
