import { describe, expect, it } from "vitest";
import {
  ACTIVATION_SURVEY_CHOICES,
  buildActivationSurveyUrls,
  choiceRequiresText,
  isActivationSurveyChoice,
  selectSurveyRecipients,
} from "../../shared/activationSurvey";

describe("isActivationSurveyChoice", () => {
  it("accepts every known slug", () => {
    for (const c of ACTIVATION_SURVEY_CHOICES) {
      expect(isActivationSurveyChoice(c)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const v of [
      "",
      "restart ",
      "RESTART",
      "gesundheit",
      null,
      3,
      undefined,
    ]) {
      expect(isActivationSurveyChoice(v)).toBe(false);
    }
  });
});

describe("choiceRequiresText", () => {
  it("requires free text for the three open-ended options", () => {
    expect(choiceRequiresText("more-support")).toBe(true);
    expect(choiceRequiresText("different-form")).toBe(true);
    expect(choiceRequiresText("other")).toBe(true);
  });

  it("does not require text for the two link-out options", () => {
    expect(choiceRequiresText("restart")).toBe(false);
    expect(choiceRequiresText("health")).toBe(false);
  });
});

describe("buildActivationSurveyUrls", () => {
  it("builds one fully-formed link per choice, keyed for the mail template", () => {
    expect(buildActivationSurveyUrls("https://mitglieder.mila.wien")).toEqual({
      survey_url_restart:
        "https://mitglieder.mila.wien/profile/activation-survey?choice=restart",
      survey_url_more_support:
        "https://mitglieder.mila.wien/profile/activation-survey?choice=more-support",
      survey_url_different_form:
        "https://mitglieder.mila.wien/profile/activation-survey?choice=different-form",
      survey_url_health:
        "https://mitglieder.mila.wien/profile/activation-survey?choice=health",
      survey_url_other:
        "https://mitglieder.mila.wien/profile/activation-survey?choice=other",
    });
  });

  it("tolerates a trailing slash on the base url", () => {
    const urls = buildActivationSurveyUrls("https://mitglieder.mila.wien/");
    expect(urls.survey_url_health).toBe(
      "https://mitglieder.mila.wien/profile/activation-survey?choice=health",
    );
  });
});

describe("selectSurveyRecipients", () => {
  const member = (id: number, userId: string | null, frozenSince: string) => ({
    id,
    activation_frozen_since: frozenSince,
    memberships_user: userId ? { id: userId } : null,
  });

  it("includes members never sent the survey", () => {
    const got = selectSurveyRecipients(
      [member(1, "u1", "2026-01-01")],
      new Map(),
    );
    expect(got.map((r) => r.userId)).toEqual(["u1"]);
  });

  it("skips members already sent since their current freeze date", () => {
    const lastSent = new Map([["u1", "2026-01-05T03:00:00.000Z"]]);
    const got = selectSurveyRecipients(
      [member(1, "u1", "2026-01-01")],
      lastSent,
    );
    expect(got).toEqual([]);
  });

  it("re-arms after a later re-freeze", () => {
    // Sent during the previous freeze; the member recovered and froze again, which
    // rewrote activation_frozen_since to a date after that send.
    const lastSent = new Map([["u1", "2026-01-05T03:00:00.000Z"]]);
    const got = selectSurveyRecipients(
      [member(1, "u1", "2026-06-01")],
      lastSent,
    );
    expect(got.map((r) => r.userId)).toEqual(["u1"]);
  });

  it("treats a send on the freeze date itself as already sent", () => {
    const lastSent = new Map([["u1", "2026-01-01T03:00:00.000Z"]]);
    expect(
      selectSurveyRecipients([member(1, "u1", "2026-01-01")], lastSent),
    ).toEqual([]);
  });

  it("skips memberships with no linked user", () => {
    expect(
      selectSurveyRecipients([member(1, null, "2026-01-01")], new Map()),
    ).toEqual([]);
  });
});
