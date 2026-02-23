export function filterOccurrence(
  occurrence: ShiftOccurrenceResponse,
  opts: {
    status: string;
    category: number;
    allowedCategories: number[];
    admin: boolean;
  },
): boolean {
  const allCats = opts.category === -1;
  const buddyNeeded = opts.status === "withbuddy";
  const unfilled = buddyNeeded || opts.status === "unfilled";
  const isPast = new Date(occurrence.start) < new Date();

  if (unfilled) {
    if (!opts.admin && occurrence.selfAssigned) return false;
    if (isPast) return false;
    if (occurrence.n_assigned >= occurrence.shift.shifts_slots) return false;
    if (
      buddyNeeded &&
      !occurrence.assignments.some((a) => a.buddy_status === "is_buddy")
    ) {
      return false;
    }
  }

  if (opts.category === 0 && occurrence.shift.shifts_category_2 != null) {
    return false;
  }

  if (
    !allCats &&
    opts.category !== 0 &&
    occurrence.shift.shifts_category_2 !== opts.category
  ) {
    return false;
  }

  if (
    allCats &&
    occurrence.shift.shifts_category_2 != null &&
    !opts.allowedCategories.includes(occurrence.shift.shifts_category_2)
  ) {
    return false;
  }

  return true;
}
