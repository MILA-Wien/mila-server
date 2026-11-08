import { describe, expect, it, vi } from "vitest";
import { ValidationError, type AnyObjectSchema } from "yup";

// Stub Nitro auto-imports before module evaluation
vi.hoisted(() => {
  (globalThis as any).defineEventHandler = (handler: any) => handler;
});

import {
  generateUserRecords,
  SEED_SCALE_SMALL_TOTAL_MEMBERSHIPS,
  TARGET_TOTAL_MEMBERSHIPS,
  VIENNA_STREETS,
  type UserRecord,
} from "../../server/api/create_example_data.post";
import { profileFormSchemas } from "../../app/composables/formValidation";

// The forms of the profile page, with the message keys as messages
const forms = Object.entries(profileFormSchemas((key) => key));

/** Errors the profile page would show for this user, per form. */
function profilePageErrors(user: UserRecord): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const [name, schema] of forms as [string, AnyObjectSchema][]) {
    try {
      schema.validateSync(user, { abortEarly: false });
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      errors[name] = error.errors;
    }
  }
  return errors;
}

describe.each([
  ["small", SEED_SCALE_SMALL_TOTAL_MEMBERSHIPS],
  ["large", TARGET_TOTAL_MEMBERSHIPS],
])("%s seed", (_, totalMemberships) => {
  const { exampleUsers, fakeUsers } = generateUserRecords(totalMemberships);

  it.each([
    ["example users", exampleUsers],
    ["fake users", fakeUsers],
  ])("all %s are valid on the profile page", (_, users) => {
    for (const user of users) {
      expect(profilePageErrors(user), user.email).toEqual({});
    }
  });
});

it.each(VIENNA_STREETS)("%s, %s is a valid address on the profile page", (street, postcode) => {
  const [user] = generateUserRecords(1).fakeUsers;
  expect(
    profilePageErrors({ ...user!, memberships_street: street, memberships_postcode: postcode }),
  ).toEqual({});
});
