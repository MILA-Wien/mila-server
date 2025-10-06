export async function getOccurrences(
  startDate: string,
  endDate: string,
  admin: boolean,
  mshipID?: number,
) {
  return await $fetch("/api/shifts/occurrences", {
    query: {
      from: startDate,
      to: endDate,
      admin: admin,
      mshipID: mshipID,
    },
  });
}

export async function getShiftsDashboard() {
  return await $fetch("/api/shifts/dashboard");
}
