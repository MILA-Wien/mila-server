import {
  createItem,
  deleteItem,
  readItem,
  readItems,
  readSingleton,
  updateItem,
} from "@directus/sdk";
import type { QueryFilter } from "@directus/sdk";
import { ShiftsShift } from "./dbSchema";

const directus = useDirectusAdmin();

// ============================================================================
// SHIFT QUERIES
// ============================================================================

export async function dbGetShifts(
  from: Date,
  to: Date,
  shiftID?: number,
  loadCat?: boolean,
) {
  const filter: QueryFilter<DbSchema, ShiftsShift> = {
    _or: [
      {
        shifts_is_regular: { _eq: false },
        shifts_from: { _gte: from.toISOString(), _lte: to.toISOString() },
      },
      {
        shifts_is_regular: { _eq: true },
        shifts_to: {
          _or: [{ _gte: from.toISOString() }, { _null: true }],
        },
        shifts_from: { _lte: to.toISOString() },
      },
    ],

    shifts_status: { _eq: "published" },
  };
  if (shiftID) {
    filter.id = { _eq: shiftID };
  }
  const shifts = await directus.request(
    readItems("shifts_shifts", {
      filter: filter,
      limit: -1,
      // @ts-expect-error shifts_category_2.* is a nested field syntax
      fields: loadCat ? ["*", "shifts_category_2.*"] : ["*"],
    }),
  );

  return shifts;
}

// ============================================================================
// ASSIGNMENT QUERIES
// ============================================================================

/** Full assignment query for internal use (reminders, cronjobs) */
export async function dbGetAssignments(
  shiftIds: number[],
  from: Date,
  to: Date,
) {
  if (shiftIds.length === 0) {
    return [];
  }

  return await directus.request(
    readItems("shifts_assignments", {
      limit: -1,
      filter: {
        _or: [
          {
            shifts_is_regular: { _eq: false },
            shifts_from: { _gte: from.toISOString(), _lte: to.toISOString() },
          },
          {
            shifts_is_regular: { _eq: true },
            shifts_to: {
              _or: [{ _gte: from.toISOString() }, { _null: true }],
            },
            shifts_from: { _lte: to.toISOString() },
          },
        ],
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
        {
          shifts_membership: [
            "id",
            "shifts_counter",
            "count(shifts_logs)",
            "shifts_can_be_coordinator",
            {
              memberships_user: [
                "id",
                "username",
                "username_last",
                "hide_name",
                "email",
                "memberships_phone",
                "send_notifications",
                "buddy_status",
              ],
            },
          ],
        },
      ],
    }),
  );
}

/** Assignment query for the API response - only fetches needed fields */
export async function dbGetAssignmentsForApi(
  shiftIds: number[],
  from: Date,
  to: Date,
  admin: boolean,
) {
  if (shiftIds.length === 0) {
    return [];
  }

  const userFields = admin
    ? ["username", "username_last", "hide_name", "buddy_status", "email", "memberships_phone"]
    : ["username", "username_last", "hide_name", "buddy_status"];

  const membershipFields = admin
    ? ["id", "count(shifts_logs)", "shifts_can_be_coordinator", { memberships_user: userFields }]
    : ["id", "shifts_can_be_coordinator", { memberships_user: userFields }];

  return await directus.request(
    readItems("shifts_assignments", {
      limit: -1,
      filter: {
        _or: [
          {
            shifts_is_regular: { _eq: false },
            shifts_from: { _gte: from.toISOString(), _lte: to.toISOString() },
          },
          {
            shifts_is_regular: { _eq: true },
            shifts_to: {
              _or: [{ _gte: from.toISOString() }, { _null: true }],
            },
            shifts_from: { _lte: to.toISOString() },
          },
        ],
        shifts_shift: {
          _in: shiftIds,
        },
      },
      // @ts-expect-error dynamic field selection
      fields: [
        "id",
        "shifts_from",
        "shifts_to",
        "shifts_shift",
        "shifts_is_regular",
        { shifts_membership: membershipFields },
      ],
    }),
  );
}

// ============================================================================
// ABSENCE QUERIES
// ============================================================================

export async function dbGetAbsences(
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

// ============================================================================
// PUBLIC HOLIDAY QUERIES
// ============================================================================

export async function dbGetPublicHolidays(from: Date, to: Date) {
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

export async function dbGetFuturePublicHolidays() {
  const now = getCurrentDate();
  return (await directus.request(
    readItems("shifts_holidays_public", {
      filter: {
        date: {
          // @ts-expect-error directus date filter bug
          _and: [{ _gte: now }],
        },
      },
      limit: -1,
      fields: ["date"],
    }),
  )) as ShiftsPublicHoliday[];
}

// ============================================================================
// SHIFT CATEGORIES
// ============================================================================

export async function dbGetShiftCategories() {
  return await directus.request(
    readItems("shifts_categories", {
      limit: -1,
      fields: ["id", "name", "beschreibung", "for_all"],
    }),
  );
}

// ============================================================================
// SHIFT LOGS
// ============================================================================

export async function dbGetShiftLogs(date: string, shiftID: number) {
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
            { memberships_user: ["username", "username_last", "email"] },
          ],
        },
      ],
    }),
  );
}

export async function dbUpdateShiftLog(
  logID: number,
  type: "attended" | "missed",
) {
  const payload: { shifts_type: string; shifts_score: number } = {
    shifts_type: type,
    shifts_score: type === "attended" ? 28 : 0,
  };
  return await directus.request(updateItem("shifts_logs", logID, payload));
}

export async function dbDeleteShiftLog(logID: number) {
  return await directus.request(deleteItem("shifts_logs", logID));
}

export async function dbCreateShiftLog(
  type: string,
  mshipID: number,
  date: string,
  shiftID?: number,
  score?: number,
  note?: string,
) {
  const finalScore = score ?? (type === "attended" ? 28 : 0);
  return await directus.request(
    createItem(
      "shifts_logs",
      {
        shifts_membership: mshipID,
        shifts_type: type,
        shifts_date: date,
        shifts_score: finalScore,
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
              { memberships_user: ["username", "username_last", "email"] },
            ],
          },
        ],
      },
    ),
  );
}

export async function dbCheckIfFirstShift(mshipId: number) {
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

// ============================================================================
// SHIFT ASSIGNMENTS CRUD
// ============================================================================

export async function dbCreateAssignment(payload: {
  shifts_membership: number;
  shifts_shift: number;
  shifts_from: string;
  shifts_is_regular: boolean;
  shifts_to?: string;
}) {
  return await directus.request(
    createItem("shifts_assignments", payload, {
      fields: [
        "id",
        "shifts_membership",
        "shifts_is_regular",
        "shifts_shift",
        "shifts_from",
        "shifts_to",
        {
          shifts_membership: [
            "id",
            {
              memberships_user: ["username", "username_last", "email"],
            },
          ],
        },
      ],
    }),
  );
}

export async function dbUpdateAssignment(
  assignmentId: number,
  payload: { shifts_to?: string },
) {
  return await directus.request(
    updateItem("shifts_assignments", assignmentId, payload),
  );
}

export async function dbDeleteAssignment(assignmentId: number) {
  return await directus.request(deleteItem("shifts_assignments", assignmentId));
}

// ============================================================================
// SHIFT ABSENCES CRUD
// ============================================================================

export async function dbCreateAbsence(payload: {
  shifts_membership: number;
  shifts_from: string;
  shifts_to: string;
  shifts_is_holiday?: boolean;
  shifts_is_for_all_assignments?: boolean;
  shifts_assignment?: number;
  shifts_status?: string;
}) {
  return await directus.request(createItem("shifts_absences", payload));
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function dbGetSettings() {
  return await directus.request(readSingleton("settings_hidden"));
}

// ============================================================================
// MEMBERSHIPS
// ============================================================================

export async function dbGetMembershipById(id: number) {
  return await directus.request(
    readItem("memberships", id, {
      fields: [
        "id",
        { memberships_user: ["username", "username_last"] },
        "memberships_type",
        "memberships_status",
        "shifts_categories_allowed",
        "shifts_user_type",
        "shifts_can_be_coordinator",
      ],
    }),
  );
}

// ============================================================================
// TILES
// ============================================================================

export async function dbGetTiles() {
  return await directus.request(
    readItems("collectivo_tiles", {
      // @ts-expect-error tiles_buttons is a nested field
      fields: ["*", { tiles_buttons: ["*"] }],
      filter: {
        tiles_view_for: {
          _neq: "hide",
        },
      },
    }),
  );
}
