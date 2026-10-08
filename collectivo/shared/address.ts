/**
 * Checks that the address parts are entered into their own fields.
 *
 * Users often type the whole address into one field, e.g. "Hauptstraße 5" as street
 * or "5/2/14" or "5 Top 14" as house number. Street, house number, stair and door are
 * stored separately, so those inputs are rejected with a hint to split them up.
 */

import { AUSTRIA } from "./countries";

/**
 * The street must not end in a house number, including suffixes like "5a", "5-7",
 * "5/2" or "5 a". Numbers inside the name ("Straße des 17. Juni") are fine.
 */
export function isValidStreet(value?: string | null): boolean {
  return !value || !/\d\S*(\s+[a-z])?\s*$/i.test(value);
}

/**
 * The city must not contain digits - usually the postcode typed into the wrong field
 * ("1010 Wien"). Punctuation is allowed: "St. Pölten", "Frankfurt (Oder)", "L'Aquila".
 */
export function isValidCity(value?: string | null): boolean {
  return !value || !/\d/.test(value);
}

/** Austrian postcodes starting with 1 belong to Vienna, so the city must be "Wien". */
export function isValidViennaCity(
  city?: string | null,
  postcode?: string | null,
  country?: string | null,
): boolean {
  return (
    !city ||
    country !== AUSTRIA ||
    !postcode?.startsWith("1") ||
    city.trim() === "Wien"
  );
}

/** Austrian postcodes have exactly 4 digits; other countries are not checked. */
export function isValidPostcode(
  postcode?: string | null,
  country?: string | null,
): boolean {
  return !postcode || country !== AUSTRIA || /^\d{4}$/.test(postcode);
}

/** House number, stair and door must not contain "/" or "top" (any case). */
export function isValidAddressPart(value?: string | null): boolean {
  return !value || !/\/|top/i.test(value);
}

/**
 * The house number must start with a digit ("1", "1a"), not only letters.
 * Not used for stair and door, which can be letters (e.g. "A", "EG").
 */
export function startsWithDigit(value?: string | null): boolean {
  return !value || /^\d/.test(value);
}
