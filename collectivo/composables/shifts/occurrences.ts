export async function getOccurrences(
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

export async function getOccurrencesUser() {
  return await $fetch("/api/shifts/occurrences_user");
}
