import { createItem, deleteItem, readItems, updateItem } from "@directus/sdk";

export type ShiftLogsAdmin = Awaited<ReturnType<typeof createShiftLog>>;

export async function getShiftLogsAdmin(
  date: string,
  shiftID: ShiftsShift | number,
) {
  const directus = useDirectus();
  return await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_shift: { _eq: shiftID },
        shifts_date: { _eq: date },
      },
      fields: [
        "id",
        "shifts_type",
        "shifts_note",
        "shifts_score",
        {
          shifts_membership: [
            "id",
            { memberships_user: ["username", "email"] },
          ],
        },
      ],
    }),
  );
}

export async function updateShiftLogsAdmin(
  logID: number,
  type: "attended" | "missed",
) {
  const directus = useDirectus();
  const payload: Partial<ShiftLogsAdmin> = {
    shifts_type: type,
  };
  payload["shifts_score"] = type === "attended" ? 28 : 0;
  return await directus.request(updateItem("shifts_logs", logID, payload));
}

export async function deleteShiftLogsAdmin(logID: number) {
  const directus = useDirectus();
  return await directus.request(deleteItem("shifts_logs", logID));
}

export async function createShiftLog(
  type: string,
  mshipID: number,
  date: string,
  shiftID?: number,
  score?: number,
  note?: string,
) {
  if (!score) {
    score = type === "attended" ? 28 : 0;
  }
  const directus = useDirectus();
  return await directus.request(
    createItem(
      "shifts_logs",
      {
        shifts_membership: mshipID,
        shifts_type: type,
        shifts_date: date,
        shifts_score: score,
        shifts_note: note,
        shifts_shift: shiftID,
      },
      {
        fields: [
          "id",
          "shifts_type",
          "shifts_note",
          "shifts_score",
          {
            shifts_membership: [
              "id",
              { memberships_user: ["username", "email"] },
            ],
          },
        ],
      },
    ),
  );
}

export async function checkLogsIfFirstShift(mshipId: number) {
  const directus = useDirectus();
  const logs = await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_membership: {
          _eq: mshipId,
        },
        shifts_type: {
          _in: ["attended", "attended_draft"],
        },
      },
      limit: 1,
    }),
  );
  return logs.length === 0;
}
