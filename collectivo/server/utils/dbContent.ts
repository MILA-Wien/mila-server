import {
  aggregate,
  createItem,
  deleteItem,
  readItem,
  readItems,
  readRoles,
  readSingleton,
  readUser,
  updateUser,
} from "@directus/sdk";

const directus = useDirectusAdmin();

// ============================================================================
// PRODUCT REQUESTS (IDEENBUCH)
// ============================================================================

export async function dbGetProductRequests(
  filter: Record<string, any>,
  page: number,
  perPage: number,
) {
  return await directus.request(
    readItems("product_requests", {
      fields: ["id", "date_created", "name", "wunsch", "antwort", "status"],
      filter: filter,
      limit: perPage,
      page: page,
      sort: ["-date_created"],
    }),
  );
}

export async function dbGetProductRequestsCount(filter: Record<string, any>) {
  return await directus.request(
    aggregate("product_requests", {
      aggregate: { count: "*" },
      query: { filter: filter },
    }),
  );
}

export async function dbCreateProductRequest(data: {
  name: string;
  wunsch: string;
  wunsch_von: number;
}) {
  return await directus.request(createItem("product_requests", data));
}

// ============================================================================
// SOLITOPF
// ============================================================================

export async function dbGetSolitopfRequests(mshipId: number) {
  return await directus.request(
    readItems("bedarfsmeldung_solitopf", {
      filter: { membership: { _eq: mshipId } },
      sort: ["-date_created"],
    }),
  );
}

export async function dbCreateSolitopfRequest(data: {
  membership: number;
  auszahlung: string;
  weitere_unterstuetzung: boolean;
}) {
  return await directus.request(
    createItem("bedarfsmeldung_solitopf", data as Partial<BedarfsmeldungSolitopf>),
  );
}

export async function dbGetSolitopfStats() {
  const [solitopf, receiving, waiting] = await Promise.all([
    directus.request(
      readSingleton("solitopf"),
    ),
    directus.request(
      aggregate("bedarfsmeldung_solitopf", {
        aggregate: { countDistinct: "membership" },
        query: {
          filter: {
            _and: [
              { status: { _eq: "angenommen" } },
              { first_payout: { _nnull: true } },
              { first_payout: { _gte: "$NOW(-6 months)" } },
            ],
          } as any,
        },
      }),
    ),
    directus.request(
      aggregate("bedarfsmeldung_solitopf", {
        aggregate: { countDistinct: "membership" },
        query: { filter: { status: { _eq: "warteliste" } } },
      }),
    ),
  ]);
  return {
    funds_available: Number(solitopf?.funds_available ?? 0.0),
    funds_received: Number(solitopf?.total_received ?? 0.0),
    funds_distributed: Number(solitopf?.total_distributed ?? 0.0),
    receiving: Number(
      (receiving as AggregateResult<"membership">)[0]?.countDistinct?.membership ?? 0,
    ),
    waiting: Number(
      (waiting as AggregateResult<"membership">)[0]?.countDistinct?.membership ?? 0,
    ),
  };
}

// ============================================================================
// USERS & PROFILES
// ============================================================================

export async function dbGetUserProfile(userId: string) {
  return await directus.request(
    readUser(userId, {
      fields: [
        "*",
        "role.name",
        "memberships.*",
        "memberships.coshoppers.memberships_coshoppers_id.*",
        "memberships.kids.memberships_coshoppers_id.*",
        "memberships.shifts_categories_allowed.shifts_categories_id",
        "memberships.shifts_skills.shifts_skills_id.*",
        "collectivo_tags.collectivo_tags_id",
      ] as any[],
    }),
  );
}

export async function dbUpdateUser(userId: string, data: Record<string, any>) {
  return await directus.request(updateUser(userId, data));
}

// ============================================================================
// TAGS
// ============================================================================

export async function dbGetTagByName(name: string) {
  const tags = await directus.request(
    readItems("collectivo_tags", {
      filter: { tags_name: { _eq: name } },
    }),
  );
  return tags[0] ?? null;
}

export async function dbGetUserTagAssignments(userId: string, tagId: number) {
  return await directus.request(
    readItems("collectivo_tags_directus_users", {
      filter: {
        collectivo_tags_id: { _eq: tagId },
        directus_users_id: { _eq: userId },
      },
    }),
  );
}

export async function dbAssignTag(userId: string, tagId: number) {
  return await directus.request(
    createItem("collectivo_tags_directus_users", {
      collectivo_tags_id: tagId,
      directus_users_id: userId,
    }),
  );
}

export async function dbRemoveTagAssignment(assignmentId: number) {
  return await directus.request(
    deleteItem("collectivo_tags_directus_users", assignmentId),
  );
}

// ============================================================================
// MEMBERSHIPS (SIMPLE)
// ============================================================================

export async function dbGetMembershipUser(id: string): Promise<{ memberships_user: string }> {
  return await directus.request(
    readItem("memberships", id, { fields: ["memberships_user"] }),
  ) as unknown as { memberships_user: string };
}

export async function dbGetActiveUserIdsByShiftcounter(counter: number) {
  const memberships = (await directus.request(
    readItems("memberships", {
      filter: {
        shifts_counter: { _eq: counter },
        memberships_status: { _eq: "approved" },
        memberships_type: { _eq: "Aktiv" },
        shifts_user_type: { _nin: ["exempt", "inactive"] },
      },
      fields: ["memberships_user.id"] as any[],
    }),
  )) as unknown as { memberships_user: { id: string } }[];

  const directus_users_ids: string[] = [];

  for (const m of memberships) {
    const user = m.memberships_user;
    if (user?.id) {
      directus_users_ids.push(user.id);
    }
  }

  return directus_users_ids;
}

// ============================================================================
// ROLES
// ============================================================================

export async function dbGetRoleByName(name: string) {
  const roles = await directus.request(
    readRoles({
      filter: { name: { _eq: name } },
    }),
  );

  if (roles.length < 1) {
    throw new Error(name + " role not found");
  }

  return roles[0]!.id;
}
