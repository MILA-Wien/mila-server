import { describe, expect, it } from "vitest";
import { isValidPersonName } from "../../shared/personName";

describe("isValidPersonName", () => {
  it.each([
    "Anna",
    "Anna-Lena",
    "O'Brien",
    "Zoë Müller",
    "Tomáš",
    "Dr. Max",
    "Max, Jr.",
    "李",
    "Ann 😀",
  ])("accepts %j", (name) => {
    expect(isValidPersonName(name)).toBe(true);
  });

  it.each([..."<>&\"$%!#?§;*~/\\|^=[]{}()"])(
    "rejects names containing %j",
    (char) => {
      expect(isValidPersonName(`An${char}na`)).toBe(false);
    },
  );

  it.each(["\n", "\t", "\x00", "\x7F", "\x85", " ", " "])(
    "rejects control characters and vertical whitespace (%j)",
    (char) => {
      expect(isValidPersonName(`An${char}na`)).toBe(false);
    },
  );

  it("lets empty values through, like Keycloak", () => {
    expect(isValidPersonName("")).toBe(true);
    expect(isValidPersonName(undefined)).toBe(true);
    expect(isValidPersonName(null)).toBe(true);
  });
});
