import type { OccurrencesApiResponse } from "../../../shared/types/shifts";

export async function getOccurrences(
  startDate: string,
  endDate: string,
  admin: boolean,
): Promise<OccurrencesApiResponse> {
  return await $fetch("/api/shifts/occurrences", {
    query: {
      from: startDate,
      to: endDate,
      admin: admin,
    },
  });
}

export async function getShiftsDashboard() {
  return await $fetch("/api/shifts/dashboard");
}
