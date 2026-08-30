import {
  createItem,
  deleteItem,
  readItem,
  readItems,
  readSingleton,
  updateItem,
  updateSingleton,
} from "@directus/sdk";
import type { MembershipDetails } from "../../shared/types/membership";

/**
 * A ShiftsAssignment where shifts_shift has been fully expanded (always an
 * object, never a raw FK). Returned by dashboard queries that use
 * `fields: ["*", { shifts_shift: ["*"] }]`.
 */
export type DashboardAssignment = Omit<ShiftsAssignment, "shifts_shift"> & {
  shifts_shift: ShiftsShift;
};

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
  const filter: Record<string, any> = {
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

function assignmentFilter(shiftIds: number[], from: Date, to: Date): any {
  return {
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
    shifts_shift: { _in: shiftIds },
  };
}

/** Assignment query for reminders — includes notification/contact fields */
export async function dbGetAssignmentsWithNotifications(
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
      filter: assignmentFilter(shiftIds, from, to) as any,
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

  const skillsFields = [
    { shifts_skills_id: ["icon"] },
  ];

  const membershipFields = admin
    ? ["id", { shifts_logs: ["id"] }, { shifts_skills: skillsFields }, { memberships_user: userFields }]
    : ["id", { shifts_skills: skillsFields }, { memberships_user: userFields }];

  return await directus.request(
    readItems("shifts_assignments", {
      limit: -1,
      filter: assignmentFilter(shiftIds, from, to) as any,
      fields: [
        "id",
        "shifts_from",
        "shifts_to",
        "shifts_shift",
        "shifts_is_regular",
        { shifts_membership: membershipFields as any },
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
      } as any,
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
      } as any,
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

export async function dbUpdateSettings(data: Partial<SettingsHidden>) {
  return await directus.request(updateSingleton("settings_hidden", data));
}

// ============================================================================
// CRONJOB QUERIES
// ============================================================================

export async function dbGetActiveHolidayMemberships(date: Date) {
  const holidays = await directus.request(
    readItems("shifts_absences", {
      filter: {
        shifts_is_holiday: { _eq: true },
        shifts_to: { _gte: date.toISOString() },
        shifts_from: { _lte: date.toISOString() },
      } as any,
      fields: ["id", "shifts_membership"],
      limit: -1,
    }),
  );
  return holidays.map((holiday) => holiday.shifts_membership as number);
}

export async function dbGetMembershipsForDecrement() {
  return await directus.request(
    readItems("memberships", {
      filter: {
        memberships_type: { _eq: "Aktiv" },
        shifts_user_type: { _in: ["jumper", "regular"] },
      },
      fields: ["id", "shifts_counter", "activation_frozen_since"],
      limit: -1,
    }),
  );
}

export async function dbDecrementMembershipCounter(id: number, counter: number) {
  return await directus.request(
    updateItem("memberships", id, { shifts_counter: counter - 1 }),
  );
}

// Memberships whose activation_frozen_since is set but that are no longer frozen.
//
// The nightly decrement only iterates memberships in the decrement set (Aktiv +
// jumper/regular, not on holiday), so it cannot clear the date for anyone who has left
// that set — most importantly a frozen member switched to `exempt`, which is exactly what
// follows a "gesundheitliche Gruende" survey answer. Holiday is deliberately NOT a
// condition here: those members are temporarily absent but still genuinely frozen.
export async function dbGetMembershipsWithStaleFrozenSince() {
  return await directus.request(
    readItems("memberships", {
      filter: {
        _and: [
          { activation_frozen_since: { _nnull: true } },
          {
            _or: [
              { shifts_counter: { _gt: -28 } },
              { shifts_user_type: { _in: ["exempt", "inactive"] } },
              { memberships_type: { _neq: "Aktiv" } },
            ],
          },
        ],
      } as any,
      fields: ["id"],
      limit: -1,
    }),
  );
}

// Activation recipient shape for a known set of memberships.
export async function dbGetActivationRecipientsByIds(ids: number[]) {
  if (!ids.length) return [] as ActivationRecipient[];
  return (await directus.request(
    readItems("memberships", {
      filter: {
        id: { _in: ids },
        memberships_status: { _eq: "approved" },
      } as any,
      fields: ["id", "activation_frozen_since", "memberships_user.id"] as any[],
      limit: -1,
    }),
  )) as unknown as ActivationRecipient[];
}

// Memberships frozen on or before the cutoff (YYYY-MM-DD) that have not opted out of the
// survey. Uses _lte rather than an exact date match so a night the mail job fails is
// retried the next night instead of dropping that cohort permanently.
export async function dbGetMembershipsDueForSurvey(cutoffStr: string) {
  return (await directus.request(
    readItems("memberships", {
      filter: {
        activation_frozen_since: { _nnull: true, _lte: cutoffStr },
        // NOT `_neq: true`: that compiles to `col != true`, which is NULL - and therefore
        // false - for rows where the flag was never set, silently suppressing them.
        _or: [
          { activation_do_not_survey: { _eq: false } },
          { activation_do_not_survey: { _null: true } },
        ],
        memberships_status: { _eq: "approved" },
      } as any,
      fields: ["id", "activation_frozen_since", "memberships_user.id"] as any[],
      limit: -1,
    }),
  )) as unknown as ActivationRecipient[];
}

export interface ActivationRecipient {
  id: number;
  activation_frozen_since: string;
  memberships_user: { id: string } | null;
}

export async function dbSetMembershipFrozenSince(id: number, value: string | null) {
  return await directus.request(
    updateItem("memberships", id, { activation_frozen_since: value }),
  );
}

export async function dbGetShiftLogsByDate(date: Date) {
  return await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_date: {
          _gte: date.toISOString(),
          _lte: date.toISOString(),
        },
      } as any,
    }),
  );
}

// ============================================================================
// DASHBOARD QUERIES
// ============================================================================

export async function dbGetDashboardAssignments(
  mship: number,
): Promise<DashboardAssignment[]> {
  const now = getCurrentDate();
  return await directus.request(
    readItems("shifts_assignments", {
      filter: {
        shifts_membership: { id: { _eq: mship } },
        shifts_to: {
          _or: [{ _gte: now.toISOString() }, { _null: true }],
        },
      } as any,
      limit: -1,
      fields: [
        "*",
        { shifts_shift: ["*"] },
        {
          shifts_membership: [
            {
              memberships_user: ["username", "username_last", "hide_name"],
            },
          ],
        },
      ],
    }),
  ) as unknown as DashboardAssignment[];
}

export async function dbGetDashboardAbsences(mship: number): Promise<ShiftsAbsence[]> {
  const now = getCurrentDate();
  return await directus.request(
    readItems("shifts_absences", {
      limit: -1,
      filter: {
        _or: [
          { shifts_membership: { id: { _eq: mship } } },
          {
            shifts_assignment: { shifts_membership: { id: { _eq: mship } } },
          },
        ],
        shifts_to: { _gte: now.toISOString() },
      } as any,
      fields: [
        "*",
        { shifts_assignment: ["id", { shifts_shift: ["shifts_name"] }] },
        {
          shifts_membership: [
            {
              memberships_user: ["username", "username_last", "hide_name"],
            },
          ],
        },
      ],
    }),
  ) as unknown as ShiftsAbsence[];
}

export async function dbGetDashboardLogs(mship: number) {
  return await directus.request(
    readItems("shifts_logs", {
      filter: { shifts_membership: mship },
      sort: ["-shifts_date"],
      limit: 5,
    }),
  );
}

// ============================================================================
// MEMBERSHIPS
// ============================================================================

export async function dbGetMembershipById(id: number): Promise<MembershipDetails> {
  return await directus.request(
    readItem("memberships", id, {
      fields: [
        "id",
        { memberships_user: ["username", "username_last"] },
        "memberships_type",
        "memberships_status",
        "shifts_categories_allowed",
        "shifts_user_type",
        { shifts_skills: [{ shifts_skills_id: ["icon"] }] },
      ] as any,
    }),
  ) as unknown as MembershipDetails;
}

// ============================================================================
// TILES
// ============================================================================

export async function dbGetTiles() {
  return await directus.request(
    readItems("collectivo_tiles", {
      fields: ["*", { tiles_buttons: ["*"] }] as any,
      filter: {
        tiles_view_for: {
          _neq: "hide",
        },
      },
    }),
  );
}
