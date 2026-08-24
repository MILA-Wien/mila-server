import { describe, expect, it } from "vitest";

// @ts-expect-error - plain .mjs script, no type declarations
import { estimateFrozenSince } from "../../backfill-membership-dates.mjs";

const TODAY = "2026-08-24";

describe("estimateFrozenSince", () => {
  it("uses today for a membership sitting at exactly -28", () => {
    // The counter only reaches the -29 floor the following night, so a member at
    // -28 froze at most one day ago. That date is known, not estimated.
    expect(
      estimateFrozenSince({
        shiftsCounter: -28,
        lastAttendedShiftDate: "2026-01-01",
        today: TODAY,
      }),
    ).toBe(TODAY);
  });

  it("estimates last attended shift + 56 days for a floored membership", () => {
    // Attending adds +28 to the counter, which then decays 1/day to the -28
    // freeze point: 28 + 28 = 56 days from the shift to the freeze.
    expect(
      estimateFrozenSince({
        shiftsCounter: -29,
        lastAttendedShiftDate: "2026-01-01",
        today: TODAY,
      }),
    ).toBe("2026-02-26");
  });

  it("clamps an estimate that would land in the future", () => {
    expect(
      estimateFrozenSince({
        shiftsCounter: -29,
        lastAttendedShiftDate: "2026-08-01",
        today: TODAY,
      }),
    ).toBe(TODAY);
  });

  it("falls back to today when there is no attended shift log", () => {
    expect(
      estimateFrozenSince({
        shiftsCounter: -29,
        lastAttendedShiftDate: null,
        today: TODAY,
      }),
    ).toBe(TODAY);
  });

  it("crosses a month boundary correctly", () => {
    expect(
      estimateFrozenSince({
        shiftsCounter: -29,
        lastAttendedShiftDate: "2026-03-15",
        today: TODAY,
      }),
    ).toBe("2026-05-10");
  });
});
