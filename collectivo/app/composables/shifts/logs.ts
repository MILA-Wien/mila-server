export type ShiftLogsAdmin = Awaited<ReturnType<typeof createShiftLog>>;

export async function getShiftLogsAdmin(
  date: string,
  shiftID: ShiftsShift | number,
) {
  return await $fetch("/api/shifts/logs", {
    query: {
      date,
      shiftId: typeof shiftID === "object" ? shiftID.id : shiftID,
    },
  });
}

export async function updateShiftLogsAdmin(
  logID: number,
  type: "attended" | "missed",
) {
  return await $fetch(`/api/shifts/logs/${logID}`, {
    method: "PUT",
    body: { type },
  });
}

export async function deleteShiftLogsAdmin(logID: number) {
  return await $fetch(`/api/shifts/logs/${logID}`, {
    method: "DELETE",
  });
}

export async function createShiftLog(
  type: string,
  mshipID: number,
  date: string,
  shiftID?: number,
  score?: number,
  note?: string,
) {
  return await $fetch("/api/shifts/logs", {
    method: "POST",
    body: {
      type,
      mshipId: mshipID,
      date,
      shiftId: shiftID,
      score,
      note,
    },
  });
}

export async function checkLogsIfFirstShift(mshipId: number) {
  return await $fetch<boolean>("/api/shifts/logs/check-first", {
    query: { mshipId },
  });
}
