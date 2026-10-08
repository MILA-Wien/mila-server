import { describe, expect, it, vi } from "vitest";

// Stub Nitro auto-imports before module evaluation
vi.hoisted(() => {
  (globalThis as any).defineEventHandler = (handler: any) => handler;
});

import { profileSchema } from "../../server/api/profile/.put";

const address = {
  memberships_country: "AT",
  memberships_street: "Hauptstraße",
  memberships_streetnumber: "1a",
  memberships_stair: "A",
  memberships_door: "EG",
  memberships_postcode: "1010",
  memberships_city: "Wien",
};

const parse = (body: Record<string, unknown>) => profileSchema.safeParse(body).success;

describe("profileSchema", () => {
  it("accepts updates without an address (e.g. from the buddy system page)", () => {
    expect(parse({ buddy_status: "is_buddy" })).toBe(true);
    // The email notification checkbox saves on its own when toggled
    expect(parse({ send_notifications: false })).toBe(true);
    expect(parse({ username: "Max", username_last: "Muster" })).toBe(true);
    // The phone number has its own form on the profile page
    expect(parse({ memberships_phone: "+43 1 234567" })).toBe(true);
    expect(parse({ memberships_phone: "" })).toBe(true);
  });

  it.each([
    ["username", "   "],
    ["username", ""],
    ["username", "Max (Moritz)"],
    ["username_last", "a".repeat(256)],
    ["memberships_phone", "43 +664 1234567"],
    ["memberships_phone", "+43 664/1234567"],
    ["memberships_phone", "12"],
    ["memberships_phone", "1".repeat(41)],
  ])("rejects %s = %j", (field, value) => {
    expect(parse({ [field]: value })).toBe(false);
  });

  it("accepts phone numbers of 3 to 40 characters", () => {
    expect(parse({ memberships_phone: "123" })).toBe(true);
    expect(parse({ memberships_phone: "1".repeat(40) })).toBe(true);
  });

  it("trims leading and trailing whitespace", () => {
    expect(
      profileSchema.parse({
        username: " Max ",
        username_last: "Muster\t",
        pronouns: "  sie/ihr ",
        memberships_phone: " +43 664 1234567 ",
        ...address,
        memberships_street: " Hauptstraße ",
      }),
    ).toMatchObject({
      username: "Max",
      username_last: "Muster",
      pronouns: "sie/ihr",
      memberships_phone: "+43 664 1234567",
      memberships_street: "Hauptstraße",
    });
  });

  it("trims spaces-only optional fields to empty", () => {
    expect(profileSchema.parse({ pronouns: "   ", memberships_phone: "   " })).toEqual({
      pronouns: "",
      memberships_phone: null,
    });
  });

  it("stores a cleared phone number as null", () => {
    expect(profileSchema.parse({ memberships_phone: "" })).toEqual({
      memberships_phone: null,
    });
  });

  it("accepts valid visible names and pronouns", () => {
    expect(parse({ username: "Zoë", username_last: "O'Brien", pronouns: "sie/ihr" })).toBe(
      true,
    );
  });

  it("accepts a valid address", () => {
    expect(parse({ username: "Max", ...address })).toBe(true);
  });

  it("requires the full address when any address field is sent", () => {
    expect(parse({ memberships_city: "Graz" })).toBe(false);
    const { memberships_street: _, ...withoutStreet } = address;
    expect(parse(withoutStreet)).toBe(false);
  });

  it("allows stair and door to be left out", () => {
    const { memberships_stair: _s, memberships_door: _d, ...rest } = address;
    expect(parse(rest)).toBe(true);
  });

  it.each([
    ["memberships_street", "Hauptstraße 5"],
    ["memberships_streetnumber", "A"],
    ["memberships_door", "1/2"],
    ["memberships_postcode", "101"],
    ["memberships_city", "1010 Wien"],
    ["memberships_city", "Vienna"],
    ["memberships_country", "Austria"],
    ["memberships_country", "Österreich"],
    ["memberships_street", "   "],
  ])("rejects %s = %j", (field, value) => {
    expect(parse({ ...address, [field]: value })).toBe(false);
  });
});
