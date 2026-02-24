import { describe, it, expect, vi } from "vitest";
import { RRule, RRuleSet } from "rrule";
import { parseUtcMidnight } from "~/server/utils/dates";

// Expose parseUtcMidnight as global (auto-imported in Nitro)
vi.stubGlobal("parseUtcMidnight", parseUtcMidnight);

import {
  getShiftRrule,
  createAssignmentRrule,
  getAssignmentRrules,
  buildHolidayRruleSet,
} from "~/server/utils/shiftsRrules";

function utc(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

describe("getShiftRrule", () => {
  it("creates weekly occurrences for a regular shift", () => {
    const shift = {
      id: 1,
      shifts_name: "Weekly",
      shifts_from: "2025-03-01",
      shifts_to: "2025-03-31",
      shifts_is_regular: true,
      shifts_repeats_every: 7,
      shifts_is_all_day: false,
      shifts_slots: 2,
      shifts_allow_self_assignment: true,
      shifts_status: "published",
    };

    const rule = getShiftRrule(shift);
    const dates = rule.between(utc("2025-03-01"), utc("2025-03-31"), true);
    // Mar 1, 8, 15, 22, 29
    expect(dates.length).toBe(5);
  });

  it("creates single occurrence for a non-regular shift", () => {
    const shift = {
      id: 2,
      shifts_name: "One-time",
      shifts_from: "2025-03-15",
      shifts_is_regular: false,
      shifts_repeats_every: 1,
      shifts_is_all_day: false,
      shifts_slots: 2,
      shifts_allow_self_assignment: true,
      shifts_status: "published",
    };

    const rule = getShiftRrule(shift);
    const dates = rule.between(utc("2025-03-01"), utc("2025-03-31"), true);
    expect(dates.length).toBe(1);
    expect(dates[0].toISOString()).toContain("2025-03-15");
  });

  it("excludes public holidays when exclude_public_holidays=true", () => {
    const shift = {
      id: 1,
      shifts_name: "Weekly",
      shifts_from: "2025-03-01",
      shifts_to: "2025-03-31",
      shifts_is_regular: true,
      shifts_repeats_every: 7,
      shifts_is_all_day: false,
      shifts_slots: 2,
      shifts_allow_self_assignment: true,
      shifts_status: "published",
      exclude_public_holidays: true,
    };

    const holidays = [{ date: "2025-03-15" }];
    const rule = getShiftRrule(shift, holidays);
    const dates = rule.between(utc("2025-03-01"), utc("2025-03-31"), true);
    // 5 - 1 (Mar 15 excluded) = 4
    expect(dates.length).toBe(4);
    const dateStrings = dates.map((d) => d.toISOString().split("T")[0]);
    expect(dateStrings).not.toContain("2025-03-15");
  });

  it("does not exclude public holidays when exclude_public_holidays=false", () => {
    const shift = {
      id: 1,
      shifts_name: "Weekly",
      shifts_from: "2025-03-01",
      shifts_to: "2025-03-31",
      shifts_is_regular: true,
      shifts_repeats_every: 7,
      shifts_is_all_day: false,
      shifts_slots: 2,
      shifts_allow_self_assignment: true,
      shifts_status: "published",
      exclude_public_holidays: false,
    };

    const holidays = [{ date: "2025-03-15" }];
    const rule = getShiftRrule(shift, holidays);
    const dates = rule.between(utc("2025-03-01"), utc("2025-03-31"), true);
    expect(dates.length).toBe(5);
  });

  it("creates open-ended rule for regular shift without end date", () => {
    const shift = {
      id: 1,
      shifts_name: "Forever",
      shifts_from: "2025-01-01",
      shifts_is_regular: true,
      shifts_repeats_every: 7,
      shifts_is_all_day: false,
      shifts_slots: 2,
      shifts_allow_self_assignment: true,
      shifts_status: "published",
    };

    const rule = getShiftRrule(shift);
    const dates = rule.between(utc("2026-01-01"), utc("2026-01-31"), true);
    // Should still produce occurrences a year later
    expect(dates.length).toBeGreaterThan(0);
  });
});

describe("createAssignmentRrule", () => {
  it("creates assignment matching shift schedule", () => {
    const shiftRule = new RRuleSet();
    shiftRule.rrule(
      new RRule({
        freq: RRule.DAILY,
        interval: 7,
        dtstart: utc("2025-03-01"),
        until: utc("2025-03-31"),
      }),
    );

    const rule = createAssignmentRrule(
      "2025-03-01",
      "2025-03-31",
      7,
      true,
      shiftRule,
    );

    const dates = rule.between(utc("2025-03-01"), utc("2025-03-31"), true);
    expect(dates.length).toBe(5);
  });

  it("creates single occurrence for non-regular assignment", () => {
    const shiftRule = new RRuleSet();
    shiftRule.rrule(
      new RRule({
        freq: RRule.DAILY,
        interval: 7,
        dtstart: utc("2025-03-01"),
        until: utc("2025-03-31"),
      }),
    );

    const rule = createAssignmentRrule(
      "2025-03-08",
      undefined,
      7,
      false,
      shiftRule,
    );

    const dates = rule.between(utc("2025-03-01"), utc("2025-03-31"), true);
    expect(dates.length).toBe(1);
    expect(dates[0].toISOString()).toContain("2025-03-08");
  });
});

describe("getAssignmentRrules", () => {
  it("creates rrules with absences correctly filtered", () => {
    const shift = {
      id: 1,
      shifts_name: "Weekly",
      shifts_from: "2025-03-01",
      shifts_to: "2025-03-31",
      shifts_is_regular: true,
      shifts_repeats_every: 7,
      shifts_is_all_day: false,
      shifts_slots: 2,
      shifts_allow_self_assignment: true,
      shifts_status: "published",
    } as any;

    const shiftRule = getShiftRrule(shift);

    const assignments = [
      {
        id: 100,
        shifts_from: "2025-03-01",
        shifts_to: "2025-03-31",
        shifts_shift: 1,
        shifts_is_regular: true,
        shifts_membership: { id: 10 },
      },
    ] as any;

    const absences = [
      {
        id: 500,
        shifts_from: "2025-03-14",
        shifts_to: "2025-03-16",
        shifts_assignment: 100,
        shifts_membership: 10,
        shifts_is_for_all_assignments: false,
      },
    ] as any;

    const rules = getAssignmentRrules(shift, shiftRule, assignments, absences);
    expect(rules.length).toBe(1);
    expect(rules[0].absences.length).toBe(1);

    // rruleWithAbsences should exclude the absence date
    const datesWithAbs = rules[0].rruleWithAbsences.between(
      utc("2025-03-01"),
      utc("2025-03-31"),
      true,
    );
    const datesWithout = rules[0].rrule.between(
      utc("2025-03-01"),
      utc("2025-03-31"),
      true,
    );
    expect(datesWithAbs.length).toBe(datesWithout.length - 1);
  });
});

describe("buildHolidayRruleSet", () => {
  it("creates RRuleSet from holiday dates", () => {
    const holidays = [
      { date: "2025-12-25" },
      { date: "2026-01-01" },
    ];

    const rruleSet = buildHolidayRruleSet(holidays);
    const dates = rruleSet.between(utc("2025-12-01"), utc("2026-01-31"), true);
    expect(dates.length).toBe(2);
  });

  it("returns empty RRuleSet for no holidays", () => {
    const rruleSet = buildHolidayRruleSet([]);
    const dates = rruleSet.between(utc("2025-01-01"), utc("2025-12-31"), true);
    expect(dates.length).toBe(0);
  });
});
