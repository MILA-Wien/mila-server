import { string, type AnySchema, type StringSchema } from "yup";
import { z } from "zod";
import {
  isValidAddressPart,
  isValidCity,
  isValidPostcode,
  isValidStreet,
  isValidViennaCity,
  startsWithDigit,
} from "../../shared/address";
import { isValidCountryCode } from "../../shared/countries";
import {
  isValidPersonName,
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_PROHIBITED_CHARACTERS,
} from "../../shared/personName";
import { isNotBlank } from "../../shared/text";

// Yup rules shared by the registration and profile forms. The messages are looked up
// with the caller's `t`, so each page needs translations for them.

type Translate = (key: string, params?: Record<string, unknown>) => string;

/** A string field that rejects input consisting only of spaces. */
export function notBlankString(t: Translate) {
  return string().test(
    "not-blank",
    () => t("Must not consist of spaces only"),
    isNotBlank,
  );
}

/**
 * Yup's email check accepts addresses without a TLD (e.g. "admin@example"),
 * but the APIs validate with zod, which rejects them. Use zod here for parity.
 */
export function isValidEmail(value?: string) {
  return !value || z.string().email().safeParse(value).success;
}

/** Adds the email check to a string schema. */
export function emailRules<S extends StringSchema<string | undefined>>(
  t: Translate,
  schema: S,
) {
  return schema.test("email", () => t("Email address is not valid"), isValidEmail);
}

/**
 * Adds Keycloak's person name rules to a string schema. Used for the visible name
 * (username / username_last), which is synced to Keycloak - see shared/personName.ts.
 */
export function personNameRules<S extends StringSchema<string | undefined>>(
  t: Translate,
  schema: S,
) {
  return schema
    .max(PERSON_NAME_MAX_LENGTH, () =>
      t("Must be at most {max} characters", { max: PERSON_NAME_MAX_LENGTH }),
    )
    .test(
      "person-name",
      () =>
        t("Contains characters that are not allowed: {chars}", {
          chars: PERSON_NAME_PROHIBITED_CHARACTERS,
        }),
      isValidPersonName,
    );
}

/**
 * Yup rules for the address fields (see shared/address.ts), used by the registration
 * and profile forms together with <FormsAddressFields>. `prefix` is prepended to the
 * field names, e.g. "directus_users__" on the registration form.
 */
export function addressSchemaFields(
  t: Translate,
  prefix = "",
): Record<string, AnySchema> {
  const key = (name: string) => `${prefix}${name}`;
  const required = () => t("This field is required");
  const text = () => notBlankString(t);
  const addressPart = <S extends StringSchema<string | undefined>>(schema: S) =>
    schema.test("address-part", () => t("t:address_part_invalid"), isValidAddressPart);

  return {
    [key("memberships_country")]: string()
      .required(required)
      .test(
        "country",
        () => t("Please select a country from the list"),
        (value) => !value || isValidCountryCode(value),
      ),
    [key("memberships_street")]: text()
      .required(required)
      .test(
        "street",
        () => t("Please enter the house number in its own field"),
        isValidStreet,
      ),
    // House number only - stair and door can be letters (e.g. "A", "EG").
    [key("memberships_streetnumber")]: addressPart(text().required(required)).test(
      "starts-with-digit",
      () => t("Must start with a number, e.g. 1 or 1a"),
      startsWithDigit,
    ),
    [key("memberships_stair")]: addressPart(text()),
    [key("memberships_door")]: addressPart(text()),
    [key("memberships_postcode")]: text()
      .required(required)
      .test("postcode", () => t("Austrian postcodes have 4 digits"), (value, context) =>
        isValidPostcode(value, context.parent[key("memberships_country")]),
      ),
    [key("memberships_city")]: text()
      .required(required)
      .test(
        "city",
        () => t("Please enter the postcode in its own field"),
        isValidCity,
      )
      .test("vienna", () => t("t:city_must_be_wien"), (value, context) =>
        isValidViennaCity(
          value,
          context.parent[key("memberships_postcode")],
          context.parent[key("memberships_country")],
        ),
      ),
  };
}
