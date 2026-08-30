import { describe, expect, it } from "vitest";
import { classifyFreezeTransition } from "../../shared/activationFreeze";

describe("classifyFreezeTransition", () => {
  it("reports a freeze when the counter crosses the threshold", () => {
    expect(
      classifyFreezeTransition({
        previousCounter: -27,
        newCounter: -28,
        hasFrozenSince: false,
      }),
    ).toBe("freeze");
  });

  it("only records - never mails - a membership that was already frozen", () => {
    // The field was introduced after these members froze, so the first nightly run sees
    // an empty date on a long-frozen membership. Stamping it is right; telling someone
    // sitting at -83 that they "just froze" is not.
    for (const previousCounter of [-28, -29, -56, -83]) {
      expect(
        classifyFreezeTransition({
          previousCounter,
          newCounter: Math.max(previousCounter - 1, -29),
          hasFrozenSince: false,
        }),
      ).toBe("record");
    }
  });

  it("does nothing for a frozen membership that already has a date", () => {
    expect(
      classifyFreezeTransition({
        previousCounter: -29,
        newCounter: -29,
        hasFrozenSince: true,
      }),
    ).toBe("none");
  });

  it("clears the date once the counter recovers", () => {
    expect(
      classifyFreezeTransition({
        previousCounter: -29,
        newCounter: -1,
        hasFrozenSince: true,
      }),
    ).toBe("clear");
  });

  it("does nothing for a healthy membership with no date", () => {
    expect(
      classifyFreezeTransition({
        previousCounter: 5,
        newCounter: 4,
        hasFrozenSince: false,
      }),
    ).toBe("none");
  });

  it("treats the threshold itself as frozen", () => {
    // canShop flips at <= -28, so -28 is already blocked; the -29 floor is a day later.
    expect(
      classifyFreezeTransition({
        previousCounter: -28,
        newCounter: -29,
        hasFrozenSince: true,
      }),
    ).toBe("none");
  });
});
