/**
 * Zod schemas for the address fields, used by the registration and profile APIs.
 * The rules themselves are in shared/address.ts; the frontend mirrors them in
 * app/composables/formValidation.ts.
 */

import { z } from "zod";
import {
  isValidAddressPart,
  isValidCity,
  isValidPostcode,
  isValidStreet,
  startsWithDigit,
} from "./address";
import { isValidCountryCode } from "./countries";
import { isValidPhone, PHONE_MAX_LENGTH, PHONE_MIN_LENGTH } from "./phone";

/** Most text columns are varchar(255). */
export const TEXT_MAX_LENGTH = 255;

/** For textareas stored in unlimited `text` columns (e.g. the survey answers). */
export const LONG_TEXT_MAX_LENGTH = 5000;

/**
 * Free-text input; leading and trailing whitespace is removed before validation.
 * Put further checks into `.pipe(...)`: zod still runs `.refine()` and `.email()`
 * after a failed `.max()`, but skips the piped schema, so the checks never see
 * overlong input.
 */
export const text = (max = TEXT_MAX_LENGTH) => z.string().trim().max(max);

/** Email address, checked only within the length limit. */
export const email = () => text().pipe(z.string().email());

/** Phone number, see shared/phone.ts. An empty string clears it (stored as null). */
export const phone = text().pipe(
  z.union([
    z.literal("").transform(() => null),
    z
      .string()
      .min(PHONE_MIN_LENGTH)
      .max(PHONE_MAX_LENGTH)
      .refine(isValidPhone, 'Only digits and spaces are allowed, "+" only at the start'),
  ]),
);

const addressPart = (schema: z.ZodString) =>
  schema.refine(isValidAddressPart, 'Must not contain "/" or "top"');

/** Per-field schemas; cross-field rules are in `addressCrossFieldIssues`. */
export const addressFieldSchemas = {
  street: text()
    .min(1)
    .pipe(z.string().refine(isValidStreet, "Street must not end in a house number")),
  // House number only - stair and door can be letters (e.g. "A", "EG").
  streetnumber: text()
    .min(1)
    .pipe(addressPart(z.string()).refine(startsWithDigit, "Must start with a digit")),
  stair: text().pipe(addressPart(z.string())).optional(),
  door: text().pipe(addressPart(z.string())).optional(),
  postcode: text().min(1),
  city: text()
    .min(1)
    .pipe(z.string().refine(isValidCity, "City must not contain digits")),
  country: z.string().refine(isValidCountryCode, "Unknown country code"),
};

/** Rules that depend on several address fields (postcode vs. country). */
export function addressCrossFieldIssues(address: {
  postcode?: string;
  country?: string;
}): { field: "postcode"; message: string }[] {
  const issues: { field: "postcode"; message: string }[] = [];
  // Object-level refinements also run when a field failed, so skip overlong input
  // here too; the field itself already reports the length.
  const tooLong = [address.postcode, address.country].some(
    (value) => (value?.length ?? 0) > TEXT_MAX_LENGTH,
  );
  if (tooLong) return issues;
  if (!isValidPostcode(address.postcode, address.country)) {
    issues.push({ field: "postcode", message: "Austrian postcodes have 4 digits" });
  }
  return issues;
}
