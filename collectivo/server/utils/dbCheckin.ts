import { createItem, readItem, readItems } from "@directus/sdk";

const directus = useDirectusAdmin();

export async function dbGetCheckinMembership(mshipId: number) {
  return await directus.request(
    readItem("memberships", mshipId, {
      fields: [
        "id",
        "memberships_card_id",
        "memberships_type",
        "shifts_counter",
        "shifts_user_type",
        { memberships_user: ["username", "username_last", "pronouns"] },
      ],
    }),
  );
}

export async function dbGetCheckinMembershipProfile(mshipId: string) {
  return await directus.request(
    readItem("memberships", mshipId, {
      fields: [{ memberships_user: ["username", "username_last", "pronouns"] }],
    }),
  );
}

export async function dbGetMembershipByCard(cardId: string) {
  return (await directus.request(
    readItems("memberships", {
      filter: {
        _or: [{ memberships_card_id: { _eq: cardId } }],
      },
      fields: [
        "id",
        "memberships_type",
        "shifts_counter",
        "shifts_user_type",
        { memberships_user: ["username", "username_last", "pronouns"] },
      ],
    }),
  )) as Membership[];
}

export async function dbGetMembershipByCoCard(cardId: string) {
  return await directus.request(
    readItems("memberships", {
      filter: {
        _or: [
          {
            coshoppers: {
              memberships_coshoppers_id: {
                membership_card_id: { _eq: cardId },
              },
            },
          },
          {
            kids: {
              memberships_coshoppers_id: {
                membership_card_id: { _eq: cardId },
              },
            },
          },
        ],
      } as any,
      fields: [
        "id",
        "memberships_type",
        "shifts_counter",
        "shifts_user_type",
        { memberships_user: ["username", "pronouns"] },
        { coshoppers: ["memberships_coshoppers_id.*"] },
        { kids: ["memberships_coshoppers_id.*"] },
      ] as any,
    }),
  );
}

export async function dbGetCheckinAbsences(mshipId: number, dateStr: string) {
  return await directus.request(
    readItems("shifts_absences", {
      filter: {
        shifts_membership: { id: { _eq: mshipId } },
        shifts_is_holiday: { _eq: true },
        shifts_to: { _gte: dateStr },
        shifts_from: { _lte: dateStr },
      } as any,
      fields: ["id"],
    }),
  );
}

export async function dbGetCheckinLog(
  mshipId: number | undefined,
  dateStr: string,
  coshopperId: string | undefined,
) {
  return await directus.request(
    readItems("milaccess_log", {
      filter: {
        membership: { _eq: mshipId },
        date: { _eq: dateStr },
        coshopper: { _eq: coshopperId || null },
      },
    }),
  );
}

export async function dbCreateCheckinLog(
  mshipId: number | undefined,
  dateStr: string,
  coshopperId: string | undefined,
) {
  return await directus.request(
    createItem("milaccess_log", {
      membership: mshipId,
      date: dateStr,
      coshopper: coshopperId as any,
    }),
  );
}
