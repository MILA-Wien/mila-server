import { describe, expect, it } from "vitest";
import { cronjobDays } from "../../shared/cronjobDays";

const days = (args: Parameters<typeof cronjobDays>[0]) =>
  cronjobDays(args).map((d) => d.toISOString().split("T")[0]);

describe("cronjobDays", () => {
  it("processes yesterday on a regular nightly run", () => {
    expect(
      days({
        lastCronjob: "2026-11-09T02:00:00",
        forceYesterday: false,
        now: new Date("2026-11-10T02:00:00Z"),
      }),
    ).toEqual(["2026-11-09"]);
  });

  it("catches up every day since the last run, up to yesterday", () => {
    expect(
      days({
        lastCronjob: "2026-11-07T02:00:00",
        forceYesterday: false,
        now: new Date("2026-11-10T02:00:00Z"),
      }),
    ).toEqual(["2026-11-07", "2026-11-08", "2026-11-09"]);
  });

  it("processes nothing if it already ran today", () => {
    expect(
      days({
        lastCronjob: "2026-11-10T01:00:00",
        forceYesterday: false,
        now: new Date("2026-11-10T02:00:00Z"),
      }),
    ).toEqual([]);
  });

  it("processes yesterday when it has never run (e.g. after seeding)", () => {
    expect(
      days({
        lastCronjob: null,
        forceYesterday: false,
        now: new Date("2026-11-10T21:31:00Z"),
      }),
    ).toEqual(["2026-11-09"]);
  });

  it("forces exactly yesterday, even when the last run was in an earlier month", () => {
    expect(
      days({
        lastCronjob: "2026-10-29T11:08:26",
        forceYesterday: true,
        now: new Date("2026-11-10T21:31:00Z"),
      }),
    ).toEqual(["2026-11-09"]);
  });
});
