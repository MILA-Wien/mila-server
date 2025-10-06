// SSE state management for the Checkin Card Scanner
// Currently only supports single subscriber / client
import { createItem, readItem, readItems } from "@directus/sdk";

type Subscriber = NodeJS.WritableStream;

interface CheckinData {
  cardId?: string | null;
  membership?: number;
  username?: string;
  shiftsType?: string;
  shiftScore?: number;
  isOnHoliday?: boolean;
  canShop?: boolean;
  coshopper?: string;
  coshopperId?: string;
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

export function confirmCheckinUser(event: any) {
  const user = getUserOrThrowError(event);

  if (user.email !== "checkin@mila.wien") {
    throw createError({
      statusCode: 401,
    });
  }
}

export function getCheckinCardId() {
  return checkinState.data?.cardId || null;
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

export async function checkinByCardId(newCardId: string) {
  if (checkinState.cardId === newCardId) return;
  const newState = await getCheckinState(newCardId);
  if (!newState.error) {
    await createLog(newState);
  }
  checkinState.cardId = newCardId;
  checkinState.data = newState;

  for (const subscriber of checkinState.subscribers) {
    subscriber.write(`data: ${JSON.stringify(checkinState.data)}\n\n`);
  }

  // Legacy mode
  // return {
  //   cardNumber: newState.cardId,
  //   membership: newState.membership,
  //   firstName: newState.username,
  //   lastName: "",
  //   shiftScore: newState.shiftScore,
  //   canShop: newState.canShop,
  //   shiftsType: newState.shiftsType,
  //   isOnHoliday: newState.isOnHoliday,
  //   isCoshopper: newState.coshopper ? true : false,
  //   coshopperFirstName: newState.coshopper,
  //   coshopperLastName: "",
  // };
}

export async function checkinByMshipId(mshipId: number) {
  const newState = await getCheckinState(undefined, mshipId);
  if (!newState.error) {
    await createLog(newState);
  }
  checkinState.cardId = null;
  checkinState.data = newState;

  for (const subscriber of checkinState.subscribers) {
    subscriber.write(`data: ${JSON.stringify(checkinState.data)}\n\n`);
  }
}

async function getCheckinState(cardID?: string, mshipId?: number) {
  if (!cardID && !mshipId) {
    return { error: "Fehlerhafte Anfrage" };
  }

  const { mship, coshopper } = await getMship(cardID, mshipId);

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
    cardId: cardID || mship.memberships_card_id || "Keine Karte",
    membership: mship.id,
    membershipsType: mship.memberships_type,
    username: mship.memberships_user.username,
    pronouns: mship.memberships_user.pronouns,
    shiftScore: mship.shifts_counter,
    shiftsType: mship.shifts_user_type,
    isOnHoliday: isOnHoliday,
    canShop: canShop,
    coshopper: coshopper_name,
    coshopperId: coshopper?.id,
  } as CheckinData;
}

async function getMship(cardID?: string, mshipId?: number) {
  if (mshipId) {
    const mship = await getMshipById(mshipId);
    return { mship, coshopper: undefined };
  }

  if (!cardID) {
    throw createError("Something went wrong");
  }

  const mship = await getMshipThroughMainCard(cardID);
  if (mship) return { mship, coshopper: undefined };

  // Not found as main card, try as coshopper card
  const { mship: mship2, coshopper } = await getMshipThroughCoCard(cardID);
  return { mship: mship2, coshopper: coshopper };
}

async function getMshipById(mshipId: number) {
  const directus = await useDirectusAdmin();
  return await directus.request(
    readItem("memberships", mshipId, {
      fields: [
        "id",
        "memberships_card_id",
        "memberships_type",
        "shifts_counter",
        "shifts_user_type",
        { memberships_user: ["username", "pronouns"] },
      ],
    }),
  );
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

async function createLog(state: CheckinData) {
  const directus = await useDirectusAdmin();
  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const logs = await directus.request(
    readItems("milaccess_log", {
      filter: {
        membership: { _eq: state.membership },
        date: { _eq: nowStr },
        coshopper: { _eq: state.coshopperId || null },
      },
    }),
  );
  if (logs.length == 0) {
    await directus.request(
      createItem("milaccess_log", {
        membership: state.membership,
        date: nowStr,
        coshopper: state.coshopperId,
      }),
    );
  }
}
