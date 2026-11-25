import { describe, expect, it } from "vitest";
import {
  formatExemptUntil,
  hasExemptionEnded,
} from "../../shared/shiftsExemption";

describe("hasExemptionEnded", () => {
  // The cronjob processes past days (the 03:00 run on 1 January processes 31 December).
  // Job 3 has already skipped the exempt member for the processed day, so the exemption
  // is over once its last day has been processed.
  it("keeps the member exempt while days before 'Befreit bis' are processed", () => {
    expect(
      hasExemptionEnded({
        shiftsUserType: "exempt",
        exemptUntil: "2026-12-31",
        processedDay: "2026-12-30",
      }),
    ).toBe(false);
  });

  it("ends the exemption once its last day (inclusive) has been processed", () => {
    expect(
      hasExemptionEnded({
        shiftsUserType: "exempt",
        exemptUntil: "2026-12-31",
        processedDay: "2026-12-31",
      }),
    ).toBe(true);
  });

  it("ends an exemption whose date already lies further back (e.g. set retroactively)", () => {
    expect(
      hasExemptionEnded({
        shiftsUserType: "exempt",
        exemptUntil: "2026-11-01",
        processedDay: "2026-11-10",
      }),
    ).toBe(true);
  });

  it("ignores a 'Befreit bis' date on a member who is not exempt", () => {
    expect(
      hasExemptionEnded({
        shiftsUserType: "regular",
        exemptUntil: "2026-11-01",
        processedDay: "2026-11-10",
      }),
    ).toBe(false);
  });

  it("never ends an open-ended exemption (no date set)", () => {
    expect(
      hasExemptionEnded({
        shiftsUserType: "exempt",
        exemptUntil: null,
        processedDay: "2026-11-10",
      }),
    ).toBe(false);
  });
});

describe("formatExemptUntil", () => {
  it("formats the date the way members read it", () => {
    expect(formatExemptUntil("2026-12-31")).toBe("31.12.2026");
    expect(formatExemptUntil("2027-01-05")).toBe("05.01.2027");
  });
});
