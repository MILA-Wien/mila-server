/**
 * Handles the check-in process for a given card ID.
 *
 * This endpoint retrieves the membership associated with the given card ID,
 * checks the membership status, and logs the check-in event.
 * It returns information about the membership, including
 * whether the member is allowed to shop.
 *
 * The request requires a valid `checkinToken` to be provided.
 *
 * @returns An object containing membership details, including:
 * - `membership`: The membership ID.
 * - `membershipsType`: The type of the membership.
 * - `firstName`: The first name of the member.
 * - `lastName`: The last name of the member.
 * - `shiftScore`: The current shift score of the member.
 * - `shiftsType`: The type of shifts the member is assigned to.
 * - `isOnHoliday`: Whether the member is currently on holiday.
 * - `canShop`: Whether the member is allowed to shop.
 * - `isCoshopper`: Whether the card ID belongs to a coshopper.
 * - `coshopperFirstName`: The first name of the coshopper (if applicable).
 * - `coshopperLastName`: The last name of the coshopper (if applicable).
 *
 * Possible errors:
 * - "Multiple memberships found for this card ID": More than one membership is associated with the card ID.
 * - "No membership found for this card ID": No membership is associated with the card ID.
 * - "Multiple coshoppers found for this card ID": More than one coshopper is associated with the card ID.
 * - "No coshopper found for this card ID": No coshopper is associated with the card ID.
 */
import { createItem, readItems } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  verifyCollectivoApiToken(event, "checkinToken");
  try {
    return await getMembershipData(event);
  } catch (error) {
    console.error("Error in getMembershipData:", error);
    return {
      error: "An error occurred while processing the request.",
    };
  }
});

async function getMembershipData(event) {
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
        { memberships_user: ["first_name", "last_name", "username"] },
      ],
    }),
  )) as Membership[];

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
          "memberships_type",
          "shifts_counter",
          "shifts_user_type",
          { memberships_user: ["first_name", "last_name", "username"] },
        ],
      }),
    )) as Membership[];

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

    const coshoppers = await directus.request(
      readItems("memberships_coshoppers", {
        filter: { membership_card_id: { _eq: cardID } },
        fields: ["id", "first_name", "last_name"],
      }),
    );

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
        shifts_membership: { id: { _eq: mship.id } },
        shifts_is_holiday: { _eq: true },
        shifts_to: { _gte: nowStr },
        shifts_from: { _lte: nowStr },
      },
      fields: ["id"],
    }),
  );
  const isOnHoliday = absences.length > 0;
  let canShop = true;

  if (mship.shifts_user_type == "inactive") {
    canShop = false;
  }

  if (mship.shifts_user_type != "exempt") {
    if (mship.shifts_counter <= -28 || isOnHoliday) {
      canShop = false;
    }
  }

  if (mship.memberships_type != "Aktiv") {
    canShop = false;
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
    membershipsType: mship.memberships_type,
    firstName: mship.memberships_user.first_name,
    lastName: mship.memberships_user.last_name,
    username: mship.memberships_user.username,
    shiftScore: mship.shifts_counter,
    shiftsType: mship.shifts_user_type,
    isOnHoliday: isOnHoliday,
    canShop: canShop,
    isCoshopper: coshopper != undefined,
    coshopperFirstName: coshopper?.first_name,
    coshopperLastName: coshopper?.last_name,
  };

  return returnObject;
}
