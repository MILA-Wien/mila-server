// SSE state management for the Checkin Card Scanner
// Currently only supports single subscriber / client
import { createItem, readItems } from "@directus/sdk";

type Subscriber = NodeJS.WritableStream;

interface CheckinData {
  cardId: string | null;
  membershipId?: string;
  username?: string;
  shiftsType?: string;
  shiftScore?: number;
  isOnHoliday?: boolean;
  canShop?: boolean;
  isCoshopper?: boolean;
  coshopperFirstName?: string;
  coshopperLastName?: string;
  error?: string;
}

interface CheckinState {
  data: CheckinData | null;
  cardId: string | null;
  subscribers: Set<Subscriber>;
}

const checkinState: CheckinState = {
  data: null,
  cardId: null,
  subscribers: new Set(),
};

export function getCheckinCardId() {
  return checkinState.data?.cardId || null;
}

export async function setCheckinCardId(newCardId: string) {
  if (checkinState.cardId === newCardId) return;

  console.log(`Checkin: New card ID received: ${newCardId}`);
  const newState = await getCheckinState(newCardId);

  checkinState.cardId = newCardId;
  checkinState.data = { cardId: newCardId, ...newState };

  for (const subscriber of checkinState.subscribers) {
    subscriber.write(`data: ${JSON.stringify(checkinState.data)}\n\n`);
  }
}

export function addCheckinSubscriber(subscriber: Subscriber) {
  console.log("New Checkin Client connected - resetting state");
  checkinState.cardId = null;
  checkinState.subscribers.clear();
  checkinState.subscribers.add(subscriber);
}

export function removeCheckinSubscriber(subscriber: Subscriber) {
  checkinState.subscribers.delete(subscriber);
}

async function checkinNewCard(cardId: string) {
  const directus = await useDirectusAdmin();

  const { mship, coshopper } = await getMship(cardId);

  if (!mship) {
    return;
  }

  // Infer shopping status

  // Return object for stream TODO

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
}

async function getCheckinState(cardID: string) {
  const { mship, coshopper } = await getMship(cardID);

  if (!mship) {
    return { error: "Diese Karte ist keiner Mitgliedschaft zugeordnet" };
  }

  const directus = await useDirectusAdmin();
  const now = getCurrentDate();
  const nowStr = now.toISOString();
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

  let coshopper_name = undefined;
  if (coshopper) {
    coshopper_name = coshopper?.first_name + " " + coshopper?.last_name;
  }

  return {
    membership: mship.id,
    membershipsType: mship.memberships_type,
    username: mship.memberships_user.username,
    pronouns: mship.memberships_user.pronouns,
    shiftScore: mship.shifts_counter,
    shiftsType: mship.shifts_user_type,
    isOnHoliday: isOnHoliday,
    canShop: canShop,
    coshopper: coshopper_name,
  };
}

async function getMship(cardID: string) {
  const mship = await getMshipThroughMainCard(cardID);
  if (mship) return { mship, coshopper: undefined };

  // Not found as main card, try as coshopper card
  const { mship: mship2, coshopper } = await getMshipThroughCoCard(cardID);
  return { mship: mship2, coshopper: coshopper };
}

async function getMshipThroughMainCard(cardID: string) {
  const directus = await useDirectusAdmin();
  const memberships = (await directus.request(
    readItems("memberships", {
      filter: {
        _or: [{ memberships_card_id: { _eq: cardID } }],
      },
      fields: [
        "id",
        "memberships_type",
        "shifts_counter",
        "shifts_user_type",
        { memberships_user: ["username", "pronouns"] },
      ],
    }),
  )) as Membership[];
  if (memberships.length > 1) {
    throw new Error("MULTIPLE_ENTRIES_FOUND_FOR_CARD_ID");
  }
  if (memberships.length === 0) {
    return null;
  }
  return memberships[0];
}

async function getMshipThroughCoCard(cardID: string) {
  console.log("Looking for coshopper card ID:", cardID);
  const directus = await useDirectusAdmin();
  const memberships = await directus.request(
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
        { memberships_user: ["username", "pronouns"] },
        { coshoppers: ["memberships_coshoppers_id.*"] },
        { kids: ["memberships_coshoppers_id.*"] },
      ],
    }),
  );
  if (memberships.length > 1) {
    throw new Error("MULTIPLE_ENTRIES_FOUND_FOR_CARD_ID");
  }

  console.log("memberships found:", memberships);

  if (memberships.length === 0) {
    return { mship2: null, coshopper: null };
  }

  let coshopper = memberships[0].coshoppers?.find(
    (c) => c.memberships_coshoppers_id.membership_card_id === cardID,
  )?.memberships_coshoppers_id;

  if (!coshopper) {
    coshopper = memberships[0].kids?.find(
      (k) => k.memberships_coshoppers_id.membership_card_id === cardID,
    )?.memberships_coshoppers_id;
  }

  if (!coshopper) {
    throw new Error("NO_COSHOPPER_FOUND_FOR_CARD_ID");
  }

  return { mship: memberships[0], coshopper };
}
