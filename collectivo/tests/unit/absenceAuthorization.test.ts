import { describe, expect, it } from "vitest";
import { checkAbsenceAuthorization } from "../../shared/absenceAuthorization";

const member = { mship: 1, shiftAdmin: false };

describe("checkAbsenceAuthorization", () => {
  it("lets a member enter an absence for all of their own assignments", () => {
    expect(
      checkAbsenceAuthorization({
        caller: member,
        absenceMembership: 1,
        assignmentMembership: undefined,
      }),
    ).toBe("allowed");
  });

  it("forbids a member to enter an absence for another membership", () => {
    expect(
      checkAbsenceAuthorization({
        caller: member,
        absenceMembership: 2,
        assignmentMembership: undefined,
      }),
    ).toBe("forbidden");
  });

  it("lets a member sign out of their own assignment", () => {
    expect(
      checkAbsenceAuthorization({
        caller: member,
        absenceMembership: 1,
        assignmentMembership: 1,
      }),
    ).toBe("allowed");
  });

  it("forbids signing someone else out of their assignment under one's own membership", () => {
    expect(
      checkAbsenceAuthorization({
        caller: member,
        absenceMembership: 1,
        assignmentMembership: 2,
      }),
    ).toBe("forbidden");
  });

  it("forbids an absence for an assignment that does not exist", () => {
    expect(
      checkAbsenceAuthorization({
        caller: member,
        absenceMembership: 1,
        assignmentMembership: null,
      }),
    ).toBe("forbidden");
  });

  describe("shift admins", () => {
    const admin = { mship: 9, shiftAdmin: true };

    it("may sign another member out of that member's assignment", () => {
      expect(
        checkAbsenceAuthorization({
          caller: admin,
          absenceMembership: 2,
          assignmentMembership: 2,
        }),
      ).toBe("allowed");
    });

    it("may not attach another member's assignment to an absence of a different membership", () => {
      expect(
        checkAbsenceAuthorization({
          caller: admin,
          absenceMembership: 2,
          assignmentMembership: 3,
        }),
      ).toBe("forbidden");
    });
  });
});
