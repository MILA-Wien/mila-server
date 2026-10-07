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
  });

  it.each([
    ["username", "   "],
    ["username", ""],
    ["username", "Max (Moritz)"],
    ["username_last", "a".repeat(256)],
    ["pronouns", "   "],
  ])("rejects %s = %j", (field, value) => {
    expect(parse({ [field]: value })).toBe(false);
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
