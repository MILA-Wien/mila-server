export type AbsenceAuthorization = "allowed" | "forbidden";

/**
 * Who may create an absence (sign-out or holiday) through the API.
 *
 * Absences are matched to assignments by assignment id alone, so checking the absence's
 * membership is not enough: the assignment must belong to that membership too, or a
 * member could sign someone else out of their shift.
 */
export function checkAbsenceAuthorization({
  caller,
  absenceMembership,
  assignmentMembership,
}: {
  caller: { mship?: number; shiftAdmin: boolean };
  absenceMembership: number;
  /**
   * Owner of the assignment named in the absence: `undefined` when the absence names no
   * assignment, `null` when the named assignment does not exist.
   */
  assignmentMembership: number | null | undefined;
}): AbsenceAuthorization {
  if (absenceMembership !== caller.mship && !caller.shiftAdmin)
    return "forbidden";
  if (
    assignmentMembership !== undefined &&
    assignmentMembership !== absenceMembership
  ) {
    return "forbidden";
  }
  return "allowed";
}
