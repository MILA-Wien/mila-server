export function getPublicHolidays(): Promise<string[]> {
  const publicHolidays = useState("public_holidays", () => loadData());

  return publicHolidays.value;
}

async function loadData() {
  return await $fetch<string[]>("/api/shifts/public-holidays");
}
