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
import { isNotBlank } from "./text";

/** Rejects input consisting only of spaces. */
export const notBlank = <T extends z.ZodType<string>>(schema: T) =>
  schema.refine(isNotBlank, "Must not consist of spaces only");

const addressPart = (schema: z.ZodString) =>
  schema.refine(isValidAddressPart, 'Must not contain "/" or "top"');

/** Per-field schemas; cross-field rules are in `addressCrossFieldIssues`. */
export const addressFieldSchemas = {
  street: notBlank(
    z.string().min(1).refine(isValidStreet, "Street must not end in a house number"),
  ),
  // House number only - stair and door can be letters (e.g. "A", "EG").
  streetnumber: notBlank(
    addressPart(z.string().min(1)).refine(startsWithDigit, "Must start with a digit"),
  ),
  stair: notBlank(addressPart(z.string())).optional(),
  door: notBlank(addressPart(z.string())).optional(),
  postcode: notBlank(z.string().min(1)),
  city: notBlank(z.string().min(1).refine(isValidCity, "City must not contain digits")),
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
