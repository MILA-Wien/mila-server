import { readItems } from "@directus/sdk";
import type { QueryFilter } from "@directus/sdk";

const directus = useDirectusAdmin();

export async function getShiftShifts(
  from: Date,
  to: Date,
): Promise<ShiftsShift[]> {
  const filter: QueryFilter<CollectivoSchema, ShiftsShift> = {
    shifts_to: {
      _or: [{ _gte: from.toISOString() }, { _null: true }],
    },
    shifts_from: { _lte: to.toISOString() },
    shifts_status: { _eq: "published" },
  };
  const shifts = await directus.request(
    readItems("shifts_shifts", {
      filter: filter,
      limit: -1,
      fields: ["*"],
    }),
  );

  return shifts;
}

export async function getShiftAssignments(
  shiftIds: number[],
  from: Date,
  to: Date,
): Promise<ShiftsAssignment[]> {
  if (shiftIds.length === 0) {
    return [];
  }
  return await directus.request(
    readItems("shifts_assignments", {
      limit: -1,
      filter: {
        shifts_to: {
          _or: [{ _gte: from.toISOString() }, { _null: true }],
        },
        shifts_from: { _lte: to.toISOString() },
        shifts_shift: {
          _in: shiftIds,
        },
      },
      fields: [
        "id",
        "shifts_from",
        "shifts_to",
        "shifts_shift",
        "shifts_is_regular",
        "shifts_is_coordination",
        {
          shifts_membership: [
            "id",
            {
              memberships_user: [
                "first_name",
                "last_name",
                "email",
                "hide_name",
              ],
            },
          ],
        },
      ],
    }),
  );
}

export async function getShiftAbsences(
  assignmentIds: number[],
  from: Date,
  to: Date,
) {
  if (assignmentIds.length === 0) {
    return [];
  }
  return await directus.request(
    readItems("shifts_absences", {
      limit: -1,
      filter: {
        shifts_status: {
          _eq: "accepted",
        },
        _or: [
          { shifts_to: { _gte: from.toISOString() } },
          { shifts_from: { _lte: to.toISOString() } },
        ],
      },
      fields: [
        "shifts_membership",
        "shifts_from",
        "shifts_to",
        "shifts_assignment",
      ],
    }),
  );
}

export async function getShiftPublicHolidays(from: Date, to: Date) {
  return await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          _and: [{ _gte: from.toISOString() }, { _lte: to.toISOString() }],
        },
      },
      limit: -1,
      fields: ["date"],
    }),
  );
}
