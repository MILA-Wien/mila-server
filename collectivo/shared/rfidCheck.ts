/**
 * Compares the member card RFID stored in the Studio with the one stored in LotzApp.
 *
 * The door check-in uses `memberships_card_id`, while LotzApp uses its own copy for the
 * credit function at the till. Both are typed in by hand, so they can drift apart. This
 * only reports — it never changes either system.
 *
 * LotzApp can attach several cards to one address (in practice: a replacement card whose
 * predecessor was never removed), so the question is whether the Studio card is *among*
 * the LotzApp cards, not whether the two are equal.
 */

export const RFID_CHECK_STATUSES = [
  "ok",
  "mismatch",
  "missing_lotzapp",
  "missing_studio",
  "no_card",
  "no_lotzapp_id",
  "lotzapp_id_unknown",
] as const;

export type RfidCheckStatus = (typeof RFID_CHECK_STATUSES)[number];

/** The part of a LotzApp `adressen` item this check reads. */
export interface LotzappAddressCards {
  ID: string;
  rfid: { nummer: string }[] | null;
}

export interface RfidCheckResult {
  status: RfidCheckStatus;
  /** Every card LotzApp has for this address, normalized. */
  lotzappCards: string[];
}

/** Card numbers are uppercase hex in both systems; this only absorbs typing slips. */
export function normalizeCardId(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

/** Maps each LotzApp address ID to its card numbers. `rfid: null` means no card. */
export function buildLotzappCardIndex(
  addresses: LotzappAddressCards[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const address of addresses) {
    const cards = (address.rfid ?? [])
      .map((card) => normalizeCardId(card.nummer))
      .filter((card) => card !== "");
    index.set(String(address.ID), cards);
  }
  return index;
}

export function checkMembershipCard(
  studioCardId: string | null | undefined,
  lotzappId: string | null | undefined,
  lotzappIndex: Map<string, string[]>,
): RfidCheckResult {
  const studioCard = normalizeCardId(studioCardId);
  const id = (lotzappId ?? "").trim();

  if (id === "") {
    return {
      status: studioCard === "" ? "no_card" : "no_lotzapp_id",
      lotzappCards: [],
    };
  }

  const lotzappCards = lotzappIndex.get(id);
  if (lotzappCards === undefined) {
    return { status: "lotzapp_id_unknown", lotzappCards: [] };
  }

  if (studioCard === "") {
    return {
      status: lotzappCards.length === 0 ? "no_card" : "missing_studio",
      lotzappCards,
    };
  }
  if (lotzappCards.length === 0) {
    return { status: "missing_lotzapp", lotzappCards };
  }
  return {
    status: lotzappCards.includes(studioCard) ? "ok" : "mismatch",
    lotzappCards,
  };
}
