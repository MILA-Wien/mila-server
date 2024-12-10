import { createItem, readItems } from "@directus/sdk";

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
            { memberships_user: ["first_name", "last_name", "email"] },
          ],
        },
      ],
    }),
  );
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
    score = type === "attended" ? 1 : type === "missed" ? -1 : 0;
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
              { memberships_user: ["first_name", "last_name", "email"] },
            ],
          },
        ],
      },
    ),
  );
}
