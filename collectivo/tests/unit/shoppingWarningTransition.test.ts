import { describe, expect, it } from "vitest";
import { reachesShoppingWarning } from "../../shared/activationFreeze";

describe("reachesShoppingWarning", () => {
  it("warns when the counter steps onto -14", () => {
    expect(reachesShoppingWarning({ previousCounter: -13, newCounter: -14 })).toBe(true);
  });

  it("does not warn again while the counter stays at -14", () => {
    // A member on holiday is not decremented, so the counter sits still. Matching on the
    // value alone mailed them every night for the length of their holiday.
    expect(reachesShoppingWarning({ previousCounter: -14, newCounter: -14 })).toBe(false);
  });

  it("does not warn before or after the warning point", () => {
    expect(reachesShoppingWarning({ previousCounter: -12, newCounter: -13 })).toBe(false);
    expect(reachesShoppingWarning({ previousCounter: -14, newCounter: -15 })).toBe(false);
  });
});
