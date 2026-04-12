// SSE state management for the Checkin Card Scanner
// Currently only supports single subscriber / client

type Subscriber = NodeJS.WritableStream;

interface CheckinData {
  cardId?: string | null;
  membership?: number;
  username?: string;
  username_last?: string;
  pronouns?: string;
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
}

const checkinState: CheckinState = {
  data: null,
  cardId: null,
};

export function confirmCheckinUser(event: any) {
  const user = getUserOrThrowError(event);

  if (user.email !== "checkin@mila.wien") {
    throw createError({
      statusCode: 401,
    });
  }
}

export function getCheckinState() {
  return checkinState.data;
}

export async function checkinByCardId(newCardId: string) {
  if (checkinState.cardId === newCardId)
    return createLegacyResponse(checkinState.data!);
  const newState = await createNewCheckinState(newCardId);
  if (!newState.error) {
    await createLog(newState);
  }
  checkinState.cardId = newCardId;
  checkinState.data = newState;
  return createLegacyResponse(newState);
}

function createLegacyResponse(data: CheckinData) {
  return {
    cardNumber: data.cardId,
    membership: data.membership,
    firstName: data.username,
    lastName: data.username_last,
    shiftScore: data.shiftScore,
    canShop: data.canShop,
    shiftsType: data.shiftsType,
    isOnHoliday: data.isOnHoliday,
    isCoshopper: data.coshopper ? true : false,
    coshopperFirstName: data.coshopper,
    coshopperLastName: "",
    error: data.error,
  };
}

export async function checkinByMshipId(mshipId: number) {
  const newState = await createNewCheckinState(undefined, mshipId);
  if (!newState.error) {
    await createLog(newState);
  }
  checkinState.cardId = null;
  checkinState.data = newState;
}

async function createNewCheckinState(cardID?: string, mshipId?: number) {
  if (!cardID && !mshipId) {
    return { error: "Fehlerhafte Anfrage" };
  }

  const { mship, coshopper } = await getMship(cardID, mshipId);

  if (!mship) {
    return { error: "Diese Karte ist keiner Mitgliedschaft zugeordnet" };
  }

  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const absences = await dbGetCheckinAbsences(mship.id, nowStr);
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

  if (!isUserProfile(mship.memberships_user)) {
    throw new Error("memberships_user was not expanded");
  }
  const mshipUser = mship.memberships_user;
  return {
    cardId: cardID || mship.memberships_card_id || "Keine Karte",
    membership: mship.id,
    membershipsType: mship.memberships_type,
    username: mshipUser.username,
    username_last: mshipUser.username_last,
    pronouns: mshipUser.pronouns,
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
    const mship = await dbGetCheckinMembership(mshipId);
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

async function getMshipThroughMainCard(cardID: string) {
  const memberships = await dbGetMembershipByCard(cardID);
  if (memberships.length > 1) {
    throw new Error("MULTIPLE_ENTRIES_FOUND_FOR_CARD_ID");
  }
  if (memberships.length === 0) {
    return null;
  }
  return memberships[0];
}

async function getMshipThroughCoCard(cardID: string) {
  const memberships = await dbGetMembershipByCoCard(cardID);
  if (memberships.length > 1) {
    throw new Error("MULTIPLE_ENTRIES_FOUND_FOR_CARD_ID");
  }

  if (memberships.length === 0) {
    return { mship2: null, coshopper: null };
  }

  const m0 = memberships[0];
  let coshopper = m0?.coshoppers?.find(
    (c) => c.memberships_coshoppers_id.membership_card_id === cardID,
  )?.memberships_coshoppers_id;

  if (!coshopper) {
    coshopper = m0?.kids?.find(
      (k) => k.memberships_coshoppers_id.membership_card_id === cardID,
    )?.memberships_coshoppers_id;
  }

  if (!coshopper) {
    throw new Error("NO_COSHOPPER_FOUND_FOR_CARD_ID");
  }

  return { mship: memberships[0]!, coshopper };
}

async function createLog(state: CheckinData) {
  const now = getCurrentDate();
  const nowStr = now.toISOString();
  const logs = await dbGetCheckinLog(state.membership, nowStr, state.coshopperId);
  if (logs.length == 0) {
    await dbCreateCheckinLog(state.membership, nowStr, state.coshopperId);
  }
}
