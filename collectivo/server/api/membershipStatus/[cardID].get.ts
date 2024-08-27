import { createItem, readItems } from "@directus/sdk";

// TODO: Also include miteinkäufer*innen and children
// TODO: Include holidays

function getCurrentDate() {
  const now = new Date();

  const currentDateUTC = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
    ),
  );

  return currentDateUTC;
}

export default defineEventHandler(async (event) => {
  const cardID = getRouterParam(event, "cardID");
  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const directus = await useDirectusAdmin();

  const memberships = (await directus.request(
    readItems("memberships", {
      filter: {
        _or: [{ memberships_card_id: { _eq: cardID } }],
      },
      fields: [
        "id",
        "shifts_counter",
        "shifts_user_type",
        { memberships_user: ["first_name", "last_name"] },
      ],
    }),
  )) as MembershipsMembership[];

  if (memberships.length > 1) {
    return {
      error: "Multiple memberships found for this card ID",
    };
  }

  let mship;
  let coshopper;
  if (memberships.length) {
    mship = memberships[0];
  } else {
    const memberships2 = (await directus.request(
      readItems("memberships", {
        filter: {
          _or: [
            {
              coshoppers: {
                memberships_coshoppers_id: {
                  membership_card_id: { _eq: cardID },
                },
              },
            },
            {
              kids: {
                memberships_coshoppers_id: {
                  membership_card_id: { _eq: cardID },
                },
              },
            },
          ],
        },
        fields: [
          "id",
          "shifts_counter",
          "shifts_user_type",
          { memberships_user: ["first_name", "last_name"] },
        ],
      }),
    )) as MembershipsMembership[];

    if (!memberships2.length) {
      return {
        error: "No membership found for this card ID",
      };
    }

    if (memberships2.length > 1) {
      return {
        error: "Multiple coshoppers found for this card ID",
      };
    }

    const coshoppers = (await directus.request(
      readItems("memberships_coshoppers", {
        filter: { membership_card_id: { _eq: cardID } },
        fields: ["id", "first_name", "last_name"],
      }),
    )) as MembershipsCoshopper[];

    if (!coshoppers.length) {
      return {
        error: "No coshopper found for this card ID",
      };
    }

    if (coshoppers.length > 1) {
      return {
        error: "Multiple coshoppers found for this card ID",
      };
    }

    mship = memberships2[0];
    coshopper = coshoppers[0];
  }

  const absences = await directus.request(
    readItems("shifts_absences", {
      filter: {
        shifts_status: {
          _eq: "accepted",
        },
        shifts_membership: { id: { _eq: mship.id } },
        shifts_is_holiday: { _eq: true },
        shifts_to: { _gte: nowStr },
        shifts_from: { _lte: nowStr },
      },
      fields: ["id"],
    }),
  );

  let canShop = true;

  if (mship.shifts_user_type == "inactive") {
    canShop = false;
  }

  if (mship.shifts_user_type != "exempt") {
    if (mship.shifts_counter < -1 || absences.length > 0) {
      canShop = false;
    }
  }

  // Create log entry
  const logs = await directus.request(
    readItems("milaccess_log", {
      filter: {
        membership: { _eq: mship.id },
        date: { _eq: nowStr },
        coshopper: { _eq: coshopper?.id },
      },
    }),
  );

  if (logs.length == 0) {
    await directus.request(
      createItem("milaccess_log", {
        membership: mship.id,
        date: nowStr,
        coshopper: coshopper?.id,
      }),
    );
  }

  const returnObject = {
    membership: mship.id,
    firstName: mship.memberships_user.first_name,
    lastName: mship.memberships_user.last_name,
    shiftScore: mship.shifts_counter,
    shiftsType: mship.shifts_user_type,
    isOnHoliday: absences.length > 0,
    canShop: canShop,
    isCoshopper: coshopper != undefined,
    coshopperFirstName: coshopper?.first_name,
    coshopperLastName: coshopper?.last_name,
  };

  return returnObject;
});
