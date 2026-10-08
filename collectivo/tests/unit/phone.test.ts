import { describe, expect, it } from "vitest";
import { isValidPhone } from "../../shared/phone";

describe("isValidPhone", () => {
  it.each([
    "+43 664 1234567",
    "+431234567",
    "+ 43 1 234",
    "0664 1234567",
    "06641234567",
  ])("accepts %j", (value) => {
    expect(isValidPhone(value)).toBe(true);
  });

  it.each([
    " +43 1 234",
    "43+1234",
    "+43 1 +234",
    "++43 1 234",
    "+",
    "+   ",
    "0664/1234567",
    "+43-664-1234567",
    "+43 (0) 1 234",
    "call me",
    "+43\t1",
  ])("rejects %j", (value) => {
    expect(isValidPhone(value)).toBe(false);
  });

  it("lets empty values through", () => {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone(undefined)).toBe(true);
    expect(isValidPhone(null)).toBe(true);
  });

  it("rejects long invalid input quickly (no regex backtracking)", () => {
    const start = Date.now();
    expect(isValidPhone("1".repeat(1_000_000) + "x")).toBe(false);
    expect(Date.now() - start).toBeLessThan(500);
  });
});
