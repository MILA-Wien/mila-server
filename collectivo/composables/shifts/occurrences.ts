export async function getOccurrencesAdmin(
  startDate: string,
  endDate: string,
  admin: boolean,
) {
  return await $fetch("/api/shifts/occurrences", {
    query: {
      from: startDate,
      to: endDate,
      admin: admin,
    },
  });
}
