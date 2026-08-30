/** Shift counter at or below which shopping is blocked (see checkin.ts). */
export const FREEZE_THRESHOLD = -28;

export type FreezeTransition = "freeze" | "record" | "clear" | "none";

/**
 * Decides what the nightly decrement should do about `activation_frozen_since`.
 *
 * The distinction that matters is between *freezing now* and *being frozen already*.
 * `activation_frozen_since` was introduced long after members started freezing, so the
 * first run after deploy encounters long-frozen memberships - some hundreds of points
 * past the threshold - with an empty date. Those need the date recorded, but they did not
 * just freeze, and must never be mailed the day-of-freeze notice.
 */
export function classifyFreezeTransition({
  previousCounter,
  newCounter,
  hasFrozenSince,
}: {
  previousCounter: number;
  newCounter: number;
  hasFrozenSince: boolean;
}): FreezeTransition {
  const wasFrozen = previousCounter <= FREEZE_THRESHOLD;
  const isFrozen = newCounter <= FREEZE_THRESHOLD;

  if (isFrozen && !hasFrozenSince) return wasFrozen ? "record" : "freeze";
  if (!isFrozen && hasFrozenSince) return "clear";
  return "none";
}
