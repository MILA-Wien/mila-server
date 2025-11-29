import {
  createItem,
  createUser,
  updateUser,
  readUsers,
  deleteUser,
} from "@directus/sdk";
import KcAdminClient from "@keycloak/keycloak-admin-client";

export default defineEventHandler(async (event) => {
  const directus = await useDirectusAdmin();
  const body = await readBody(event);
  const userData: any = {};
  const membershipData: any = {};
  const coshopperData: any = {};

  // Check if user is authenticated
  const user = await getUserOrUndefined(event);
  const isAuthenticated = user !== undefined;
  let userID = user?.user;

  // Assign share numbers based on shares_options
  if (body.shares_options === "normal") {
    body.memberships__memberships_shares = 9;
  } else if (body.shares_options === "social") {
    body.memberships__memberships_shares = 1;
  }
  if (
    !body.memberships__memberships_shares ||
    body.memberships__memberships_shares <= 0
  ) {
    throw new Error("Incorrect number of shares.");
  }
  console.log(
    "Shares: " +
      body.memberships__memberships_shares +
      " (" +
      body.shares_options +
      ")",
  );

  // Extract user and membership data from body
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith("directus_users__")) {
      userData[key.replace("directus_users__", "")] = value;
    } else if (key.startsWith("memberships__")) {
      membershipData[key.replace("memberships__", "")] = value;
    } else if (key.startsWith("coshopper")) {
      coshopperData[key] = value;
    }
  }

  // Disable security fields
  delete userData.provider;
  delete userData.external_identifier;
  delete userData.id;
  delete userData.token;
  delete userData.status;
  delete userData.role;
  delete userData.auth_data;
  if (isAuthenticated) {
    delete userData.password;
    delete userData.email;
  }

  // Set custom username if applicable
  if (!body.use_custom_username) {
    userData.username = userData.first_name;
    userData.username_last = userData.last_name;
  }

  // Transform checkboxgroups to string
  userData.mila_groups_interested_2 = JSON.stringify(
    userData.mila_groups_interested_2,
  );
  userData.mila_skills_2 = JSON.stringify(userData.mila_skills_2);
  userData.survey_languages = JSON.stringify(userData.survey_languages);

  // Check if user exists
  if (!isAuthenticated) {
    if (!userData.email) {
      throw createError({
        statusCode: 400,
        statusMessage: "Email is required.",
      });
    }
    await checkIfEmailExists(userData.email);
  }

  // Create directus user
  if (isAuthenticated) {
    await directus.request(updateUser(userID!, userData));
  } else {
    console.log("Creating user:", JSON.stringify(userData));
    const user = await directus.request(createUser(userData));
    userID = user.id;
  }

  // Create directus membership
  membershipData.memberships_user = userID;
  membershipData.memberships_status = "applied";
  membershipData.memberships_date_applied = new Date().toISOString();

  let membership = undefined;

  try {
    membership = await directus.request(
      createItem("memberships", membershipData),
    );
  } catch (e) {
    if (!isAuthenticated) {
      // Roll back user creation in case of error
      await directus.request(deleteUser(userID!));
    }

    throw e;
  }

  try {
    // Create coshopper user if applicable
    if (body.add_coshopper) {
      const coshopper = await directus.request(
        createItem("memberships_coshoppers", {
          first_name: coshopperData.coshopper_firstname,
          last_name: coshopperData.coshopper_lastname,
          email: coshopperData.coshopper_email,
        }),
      );
      // Link coshopper to membership
      await directus.request(
        createItem("memberships_memberships_coshoppers", {
          memberships_id: membership.id,
          memberships_coshoppers_id: coshopper.id,
        }),
      );
    }
  } catch (e) {
    console.log("Error creating coshopper:", e);
  }

  return {
    status: 201,
    body: {
      user: userID,
      membership: membership.id,
    },
  };
});

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
