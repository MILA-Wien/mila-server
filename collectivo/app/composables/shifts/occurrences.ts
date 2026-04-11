export async function getOccurrences(
  startDate: string,
  endDate: string,
  admin: boolean,
): Promise<OccurrencesApiResponse> {
  return await $fetch<OccurrencesApiResponse>("/api/shifts/occurrences", {
    query: {
      from: startDate,
      to: endDate,
      admin: admin,
    },
  });
}

export async function getShiftsDashboard(): Promise<any> {
  return await $fetch("/api/shifts/dashboard");
}
