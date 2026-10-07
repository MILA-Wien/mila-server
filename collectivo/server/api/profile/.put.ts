import { z } from "zod";
import {
  isValidPersonName,
  PERSON_NAME_MAX_LENGTH,
} from "../../../shared/personName";
import {
  addressCrossFieldIssues,
  addressFieldSchemas as address,
  notBlank,
} from "../../../shared/addressSchema";

// Synced to Keycloak firstName/lastName - see shared/personName.ts.
const personName = notBlank(
  z
    .string()
    .min(1)
    .max(PERSON_NAME_MAX_LENGTH)
    .refine(isValidPersonName, "Name contains characters that are not allowed"),
);

const REQUIRED_ADDRESS_FIELDS = [
  "memberships_street",
  "memberships_streetnumber",
  "memberships_postcode",
  "memberships_city",
  "memberships_country",
] as const;

// All fields are optional because callers update different parts of the profile
// (e.g. the buddy system page only sends buddy_*). The address is all-or-nothing,
// so the rules between postcode, city and country can be checked.
export const profileSchema = z
  .object({
    username: personName.optional(),
    username_last: personName.optional(),
    pronouns: notBlank(z.string()).optional(),
    hide_name: z.boolean().optional(),
    send_notifications: z.boolean().optional(),
    buddy_status: z.enum(["need_buddy", "is_buddy", "keine_angabe"]).optional(),
    buddy_details: z.string().optional(),
    memberships_street: address.street.optional(),
    memberships_streetnumber: address.streetnumber.optional(),
    memberships_stair: address.stair,
    memberships_door: address.door,
    memberships_postcode: address.postcode.optional(),
    memberships_city: address.city.optional(),
    memberships_country: address.country.optional(),
  })
  .superRefine((data, ctx) => {
    const hasAddress = Object.keys(data).some((key) =>
      key.startsWith("memberships_"),
    );
    if (!hasAddress) return;
    for (const field of REQUIRED_ADDRESS_FIELDS) {
      if (data[field] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required when updating the address",
          path: [field],
        });
      }
    }
    const issues = addressCrossFieldIssues({
      postcode: data.memberships_postcode,
      city: data.memberships_city,
      country: data.memberships_country,
    });
    for (const { field, message } of issues) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: [`memberships_${field}`],
      });
    }
  });

export default defineEventHandler(async (event) => {
  const user = getMemberOrThrowError(event);
  const data = await readValidatedBody(event, profileSchema.parse);
  await dbUpdateUser(user.user, data);
});
