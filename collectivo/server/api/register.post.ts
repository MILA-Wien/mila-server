import {
  createItem,
  createUser,
  updateUser,
  readUsers,
  deleteUser,
} from "@directus/sdk";
import KcAdminClient from "@keycloak/keycloak-admin-client";
import { z } from "zod";

// ============================================================================
// Validation schema - aligned with frontend Yup schema
// ============================================================================

export const registerSchema = z
  .object({
    // User account
    directus_users__email: z.string().email(),
    directus_users__password: z.string().min(1),
    directus_users__first_name: z.string().min(1),
    directus_users__last_name: z.string().min(1),
    directus_users__memberships_person_type: z.enum(["natural", "legal"]),
    directus_users__memberships_gender: z.string().min(1),
    directus_users__memberships_phone: z.string().optional(),
    directus_users__memberships_birthday: z.string().optional(),
    directus_users__memberships_occupation: z.string().optional(),

    // Organization (legal entity)
    directus_users__memberships_organization_name: z.string().optional(),
    directus_users__memberships_organization_type: z.string().optional(),
    directus_users__memberships_organization_id: z.string().optional(),

    // Visible name
    use_custom_username: z.boolean().optional(),
    directus_users__username: z.string().optional(),
    directus_users__username_last: z.string().optional(),
    directus_users__pronouns: z.string().optional(),
    directus_users__use_pronouns_on_card: z.boolean().optional(),
    directus_users__hide_name: z.boolean().optional(),

    // Address
    directus_users__memberships_street: z.string().min(1),
    directus_users__memberships_streetnumber: z.string().min(1),
    directus_users__memberships_stair: z.string().optional(),
    directus_users__memberships_door: z.string().optional(),
    directus_users__memberships_postcode: z.string().min(1),
    directus_users__memberships_city: z.string().min(1),
    directus_users__memberships_country: z.string().min(1),

    // Membership
    memberships__memberships_type: z.string().min(1),
    shares_options: z.enum(["social", "normal", "more"]),
    memberships__memberships_shares: z.number().int().min(1).optional(),

    // Payment
    directus_users__payments_type: z.string().min(1),
    directus_users__payments_account_iban: z.string().optional(),
    directus_users__payments_account_owner: z.string().optional(),

    // Co-shopper
    add_coshopper: z.boolean().optional(),
    coshopper_firstname: z.string().optional(),
    coshopper_lastname: z.string().optional(),
    coshopper_email: z.string().email().optional().or(z.literal("")),

    // Survey
    directus_users__mila_survey_contact: z.string().optional(),
    directus_users__mila_survey_motivation: z.string().optional(),
    directus_users__mila_groups_interested_2: z.array(z.string()).optional(),
    directus_users__mila_skills_2: z.array(z.string()).optional(),
    directus_users__survey_languages: z.array(z.string()).optional(),
    directus_users__survey_languages_additional: z.string().optional(),
    directus_users__mila_pr_approved: z.boolean().optional(),

    // Frontend-only fields (validated but not used on backend)
    _pw_confirm: z.string().optional(),
    _statutes_approval: z.boolean().optional(),
    _data_approval: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.shares_options === "more") {
        return (
          data.memberships__memberships_shares != null &&
          data.memberships__memberships_shares >= 10
        );
      }
      return true;
    },
    {
      message: "Custom share count must be at least 10",
      path: ["memberships__memberships_shares"],
    },
  )
  .refine(
    (data) => {
      if (data.add_coshopper) {
        return (
          !!data.coshopper_firstname &&
          !!data.coshopper_lastname &&
          !!data.coshopper_email
        );
      }
      return true;
    },
    {
      message: "Co-shopper details are required",
      path: ["coshopper_firstname"],
    },
  );

// ============================================================================
// Handler
// ============================================================================

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, registerSchema.parse);
  const directus = await useDirectusAdmin();

  // Check if user is authenticated
  const user = await getUserOrUndefined(event);
  const isAuthenticated = user !== undefined;
  let userID = user?.user;

  // Determine share count
  const sharesCount = getSharesCount(body.shares_options, body.memberships__memberships_shares);

  // Extract user and membership data from validated body
  const userData = extractUserData(body, isAuthenticated);
  const membershipData = extractMembershipData(body, sharesCount);

  // Check if email already exists (new users only)
  if (!isAuthenticated) {
    await checkIfEmailExists(userData.email!);
  }

  // Create or update user
  if (isAuthenticated) {
    await directus.request(updateUser(userID!, userData));
  } else {
    const created = await directus.request(createUser(userData));
    userID = created.id;
  }

  // Create membership
  membershipData.memberships_user = userID;
  membershipData.memberships_status = "applied";
  membershipData.memberships_date_applied = new Date().toISOString();

  let membership;
  try {
    membership = await directus.request(
      createItem("memberships", membershipData),
    );
  } catch (e) {
    if (!isAuthenticated) {
      await directus.request(deleteUser(userID!));
    }
    throw e;
  }

  // Create co-shopper if applicable
  if (body.add_coshopper && body.coshopper_firstname) {
    try {
      const coshopper = await directus.request(
        createItem("memberships_coshoppers", {
          first_name: body.coshopper_firstname,
          last_name: body.coshopper_lastname,
          email: body.coshopper_email,
        }),
      );
      await directus.request(
        createItem("memberships_memberships_coshoppers", {
          memberships_id: membership.id,
          memberships_coshoppers_id: coshopper.id,
        }),
      );
    } catch (e) {
      console.log("Error creating coshopper:", e);
    }
  }

  return {
    status: 201,
    body: {
      user: userID,
      membership: membership.id,
    },
  };
});

// ============================================================================
// Helpers
// ============================================================================

export function getSharesCount(
  sharesOptions: string,
  customShares?: number,
): number {
  if (sharesOptions === "social") return 1;
  if (sharesOptions === "normal") return 9;
  if (!customShares || customShares <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Incorrect number of shares.",
    });
  }
  return customShares;
}

export function extractUserData(
  body: z.infer<typeof registerSchema>,
  isAuthenticated: boolean,
) {
  const userData: Record<string, any> = {};

  // Extract all directus_users__ prefixed fields
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith("directus_users__")) {
      userData[key.replace("directus_users__", "")] = value;
    }
  }

  // Remove security-sensitive fields
  if (isAuthenticated) {
    delete userData.password;
    delete userData.email;
  }

  // Set username from name fields if not custom
  if (!body.use_custom_username) {
    userData.username = userData.first_name;
    userData.username_last = userData.last_name;
  }

  // Transform arrays to JSON strings for Directus
  if (userData.mila_groups_interested_2) {
    userData.mila_groups_interested_2 = JSON.stringify(
      userData.mila_groups_interested_2,
    );
  }
  if (userData.mila_skills_2) {
    userData.mila_skills_2 = JSON.stringify(userData.mila_skills_2);
  }
  if (userData.survey_languages) {
    userData.survey_languages = JSON.stringify(userData.survey_languages);
  }

  return userData;
}

export function extractMembershipData(
  body: z.infer<typeof registerSchema>,
  sharesCount: number,
) {
  const membershipData: Record<string, any> = {
    memberships_shares: sharesCount,
  };

  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith("memberships__") && key !== "memberships__memberships_shares") {
      membershipData[key.replace("memberships__", "")] = value;
    }
  }

  return membershipData;
}

async function getKeycloakAdmin() {
  const config = useRuntimeConfig();

  const keycloak = new KcAdminClient({
    baseUrl: config.public.keycloakUrl,
    realmName: config.public.keycloakRealm,
  });

  await keycloak.auth({
    grantType: "client_credentials",
    clientId: config.keycloakAdminClient,
    clientSecret: config.keycloakAdminSecret,
  });

  return keycloak;
}

async function checkIfEmailExists(email: string) {
  const config = useRuntimeConfig();
  const directus = await useDirectusAdmin();

  const usersRes = await directus.request(
    readUsers({
      fields: ["id"],
      filter: {
        email: {
          _eq: email,
        },
      },
    }),
  );

  if (usersRes.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "EMAIL_ALREADY_EXISTS_DIRECTUS",
    });
  }

  if (config.public.useKeycloak) {
    const keycloak = await getKeycloakAdmin();
    const kcUser = await keycloak.users.find({ email: email });

    if (kcUser.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "EMAIL_ALREADY_EXISTS_KEYCLOAK",
      });
    }
  }
}
