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
  isValidViennaCity,
  startsWithDigit,
} from "./address";
import { isValidCountryCode } from "./countries";
import { isValidPhone, PHONE_MAX_LENGTH, PHONE_MIN_LENGTH } from "./phone";

/** Free-text input; leading and trailing whitespace is removed before validation. */
export const text = () => z.string().trim();

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
  street: text().min(1).refine(isValidStreet, "Street must not end in a house number"),
  // House number only - stair and door can be letters (e.g. "A", "EG").
  streetnumber: addressPart(text().min(1)).refine(
    startsWithDigit,
    "Must start with a digit",
  ),
  stair: addressPart(text()).optional(),
  door: addressPart(text()).optional(),
  postcode: text().min(1),
  city: text().min(1).refine(isValidCity, "City must not contain digits"),
  country: z.string().refine(isValidCountryCode, "Unknown country code"),
};

/** Rules that depend on several address fields (postcode/city vs. country). */
export function addressCrossFieldIssues(address: {
  postcode?: string;
  city?: string;
  country?: string;
}): { field: "postcode" | "city"; message: string }[] {
  const issues: { field: "postcode" | "city"; message: string }[] = [];
  if (!isValidPostcode(address.postcode, address.country)) {
    issues.push({ field: "postcode", message: "Austrian postcodes have 4 digits" });
  }
  if (!isValidViennaCity(address.city, address.postcode, address.country)) {
    issues.push({
      field: "city",
      message: 'City must be "Wien" for Austrian postcodes starting with 1',
    });
  }
  return issues;
}
