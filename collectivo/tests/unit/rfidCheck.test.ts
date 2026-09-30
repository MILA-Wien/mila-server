import { describe, expect, it } from "vitest";
import {
  buildLotzappCardIndex,
  checkMembershipCard,
  normalizeCardId,
} from "../../shared/rfidCheck";

describe("normalizeCardId", () => {
  it("trims and uppercases", () => {
    expect(normalizeCardId(" 291466b3 ")).toBe("291466B3");
  });

  it("treats null and undefined as empty", () => {
    expect(normalizeCardId(null)).toBe("");
    expect(normalizeCardId(undefined)).toBe("");
  });
});

describe("buildLotzappCardIndex", () => {
  it("maps address IDs to normalized card numbers", () => {
    const index = buildLotzappCardIndex([
      { ID: "1", rfid: [{ nummer: "291466b3" }] },
      { ID: "2", rfid: [{ nummer: "AAAA0001" }, { nummer: "AAAA0002" }] },
      { ID: "3", rfid: null },
    ]);
    expect(index.get("1")).toEqual(["291466B3"]);
    expect(index.get("2")).toEqual(["AAAA0001", "AAAA0002"]);
    expect(index.get("3")).toEqual([]);
  });

  it("drops blank card numbers", () => {
    const index = buildLotzappCardIndex([{ ID: "1", rfid: [{ nummer: " " }] }]);
    expect(index.get("1")).toEqual([]);
  });
});

describe("checkMembershipCard", () => {
  const index = buildLotzappCardIndex([
    { ID: "10", rfid: [{ nummer: "291466B3" }] },
    { ID: "11", rfid: [{ nummer: "OLD00001" }, { nummer: "NEW00002" }] },
    { ID: "12", rfid: null },
  ]);

  it("is ok when the Studio card is the LotzApp card", () => {
    expect(checkMembershipCard("291466b3 ", "10", index)).toEqual({
      status: "ok",
      lotzappCards: ["291466B3"],
    });
  });

  it("is ok when the Studio card is one of several LotzApp cards, and reports all of them", () => {
    expect(checkMembershipCard("NEW00002", "11", index)).toEqual({
      status: "ok",
      lotzappCards: ["OLD00001", "NEW00002"],
    });
  });

  it("is a mismatch when LotzApp has other cards only", () => {
    expect(checkMembershipCard("DEADBEEF", "10", index).status).toBe(
      "mismatch",
    );
  });

  it("is missing_lotzapp when LotzApp has no card", () => {
    expect(checkMembershipCard("291466B3", "12", index).status).toBe(
      "missing_lotzapp",
    );
  });

  it("is missing_studio when only LotzApp has a card", () => {
    expect(checkMembershipCard("", "10", index)).toEqual({
      status: "missing_studio",
      lotzappCards: ["291466B3"],
    });
  });

  it("is no_card when neither system has a card", () => {
    expect(checkMembershipCard(null, "12", index).status).toBe("no_card");
    expect(checkMembershipCard(null, null, index).status).toBe("no_card");
  });

  it("is no_lotzapp_id when the Studio has a card but no LotzApp link", () => {
    expect(checkMembershipCard("291466B3", null, index).status).toBe(
      "no_lotzapp_id",
    );
    expect(checkMembershipCard("291466B3", " ", index).status).toBe(
      "no_lotzapp_id",
    );
  });

  it("is lotzapp_id_unknown when LotzApp has no such address", () => {
    expect(checkMembershipCard("291466B3", "999", index)).toEqual({
      status: "lotzapp_id_unknown",
      lotzappCards: [],
    });
  });
});
