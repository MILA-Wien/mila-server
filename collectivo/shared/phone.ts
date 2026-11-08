/**
 * Phone numbers may only contain digits and spaces, with an optional "+" at the start,
 * e.g. "+43 664 1234567" or "0664 1234567".
 */
// Keep the pattern free of overlapping quantifiers - the register API is public, so a
// pattern that backtracks on long input would let anyone block the server.
const PHONE_PATTERN = /^\+?[0-9 ]+$/;
const HAS_DIGIT = /[0-9]/;

export const PHONE_MIN_LENGTH = 3;
export const PHONE_MAX_LENGTH = 40;

/** Checks the allowed characters. Empty values pass; length is checked separately. */
export function isValidPhone(value?: string | null): boolean {
  return !value || (PHONE_PATTERN.test(value) && HAS_DIGIT.test(value));
}
