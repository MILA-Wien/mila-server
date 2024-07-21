import { readItems } from "@directus/sdk";
import { DateTime } from "luxon";
import { RRule, RRuleSet } from "rrule";

interface GetShiftOccurrencesOptions {
  shiftType?: "regular" | "jumper" | "unfilled" | "all";
  admin?: boolean;
}

export const getShiftOccurrences = async (
  from: DateTime,
  to: DateTime,
  options: GetShiftOccurrencesOptions = {},
): Promise<ShiftOccurrence[]> => {
  const directus = useDirectus();
  const { shiftType } = options;
  const isJumper = shiftType === "jumper";
  const isRegular = shiftType === "regular";
  const isUnfilled = shiftType === "unfilled";
  const isAll = shiftType === "all";

  const shifts: ShiftsShift[] = (await directus.request(
    readItems("shifts_shifts", {
      filter: {
        shifts_to: {
          _or: [{ _gte: from.toISO() }, { _null: true }],
        },
        shifts_from: { _lte: to.toISO() },
        shifts_status: { _eq: "published" },
      },
      fields: ["*", "shifts_slots.id", "shifts_slots.shifts_name"],
    }),
  )) as ShiftsShift[];

  // Create array of slot ids from shift.shift_slots in shifts
  const slotIds = [];
  for (const shift of shifts) {
    for (const slot of shift.shifts_slots || []) {
      slotIds.push(slot.id);
    }
  }

  // Get assignments within timeframe
  const assignments =
    slotIds && slotIds.length > 0
      ? ((await directus.request(
          readItems("shifts_assignments", {
            filter: {
              shifts_to: {
                _or: [{ _gte: from.toISO() }, { _null: true }],
              },
              shifts_from: { _lte: to.toISO() },
              shifts_slot: {
                _in: slotIds,
              },
            },
            fields: options.admin
              ? [
                  "id",
                  "shifts_from",
                  "shifts_to",
                  "shifts_slot",
                  "shifts_membership.id",
                  "shifts_membership.memberships_user.first_name",
                  "shifts_membership.memberships_user.last_name",
                  "shifts_membership.memberships_user.email",
                ]
              : ["*"],
          }),
        )) as ShiftsAssignment[])
      : ([] as ShiftsAssignment[]);

  const assignmentIds = assignments.map((assignment) => assignment.id);

  const absences = [];
  if (assignmentIds.length) {
    const absences_ = (await directus.request(
      readItems("shifts_absences", {
        filter: {
          shifts_status: {
            _eq: "approved",
          },
          _or: [
            { shifts_to: { _gte: from.toISO() } },
            { shifts_from: { _lte: to.toISO() } },
          ],
        },
        fields: [
          "shifts_membership",
          "shifts_from",
          "shifts_to",
          "shifts_assignment",
        ],
      }),
    )) as ShiftsAbsence[];
    absences.push(...absences_);
  }

  const occurrences = [];

  // Assign assignments to slots
  for (const shift of shifts) {
    const shiftRule = shiftToRRule(shift);
    const slotRules: SlotRrule[] = [];

    for (const slot of shift.shifts_slots ?? []) {
      const filteredAssignments = assignments.filter(
        (assignment) => assignment.shifts_slot === slot.id,
      );

      const [slotRule, assignmentRules] = slotToRrule(
        shift,
        shiftRule,
        filteredAssignments,
        absences,
      );
      slotRules.push({
        id: slot.id as number,
        slot: slot as ShiftsSlot,
        rrule: slotRule,
        assignments: assignmentRules,
      });
    }

    const today = getCurrentDate();
    let minDate = from.toJSDate();
    let maxDate = to.toJSDate();

    // Jumper and regular can only be into the future
    if ((isJumper || isRegular || isUnfilled) && minDate < today) {
      minDate = today;
    }

    // Jumpers will only see the next 4 weeks
    if (isJumper) {
      const jumperLimit = getFutureDate(28);

      if (jumperLimit < maxDate) {
        maxDate = jumperLimit;
      }
    }

    const shiftOccurrences = getOccurrencesForShift(
      shift,
      shiftRule,
      slotRules,
      minDate,
      maxDate,
    );

    // Show only shifts with open slots
    if (!isAll) {
      occurrences.push(
        ...shiftOccurrences.filter(
          (occurrence) => occurrence.openSlots.length > 0,
        ),
      );
    } else {
      occurrences.push(...shiftOccurrences);
    }
  }

  occurrences.sort((a, b) => {
    return a.start.toMillis() - b.start.toMillis();
  });

  return occurrences;
};

// Get all occurrences for a shift in a given timeframe
export const getOccurrencesForShift = (
  shift: ShiftsShift,
  shiftRule: RRule,
  slotRules: SlotRrule[],
  from: Date,
  to: Date,
): ShiftOccurrence[] => {
  const dates: Date[] = shiftRule.between(from, to, true);

  const shiftOccurrences: ShiftOccurrence[] = [];

  for (const date of dates) {
    shiftOccurrences.push(
      getSingleShiftOccurence(shift, date, shiftRule, slotRules),
    );
  }

  return shiftOccurrences;
};

// Get occurence object for a shift on a given date
// Includes information about shift, slots, and assignments
// Time is always given in UTC - even if meant for other timezones
const getSingleShiftOccurence = (
  shift: ShiftsShift,
  date: Date,
  shiftRule: RRule,
  slotRules: SlotRrule[],
): ShiftOccurrence => {
  const openSlots: number[] = [];
  const slotOccurrences: SlotOccurrence[] = [];

  for (const slotRule of slotRules ?? []) {
    if (slotRule.rrule.between(date, date, true).length > 0) {
      openSlots.push(slotRule.id);
    }

    const slotOccurrence: SlotOccurrence = {
      slot: slotRule.slot,
      assignments: [],
      absentAssignments: [],
    };

    for (const assignment of slotRule.assignments) {
      if (assignment.rrule.between(date, date, true).length > 0) {
        slotOccurrence.assignments.push(assignment.assignment);
      }
      for (const absence of assignment.absences) {
        if (absence._rrule.between(date, date, true).length > 0) {
          slotOccurrence.absentAssignments.push(
            absence.shifts_assignment as ShiftsAssignment,
          );
        }
      }
    }

    slotOccurrences.push(slotOccurrence);
  }

  const dateString = date.toISOString().split("T")[0];

  const start = DateTime.fromISO(
    `${dateString}T${shift.shifts_from_time}Z`,
  ).toUTC();

  const end = DateTime.fromISO(
    `${dateString}T${shift.shifts_to_time}Z`,
  ).toUTC();

  return {
    shift: shift,
    start: start,
    end: end,
    shiftRule: shiftRule,
    slotNumber: slotRules?.length ?? 0,
    openSlots: openSlots,
    slots: slotOccurrences,
  };
};

// Create a RRule object for a shift
// Shifts without end date run forever
// Shifts without repetition run once
// Dates are with T=00:00:00 UTC
export const shiftToRRule = (shift: ShiftsShift): RRule => {
  return new RRule({
    freq: RRule.DAILY,
    interval: shift.shifts_repeats_every,
    count: shift.shifts_repeats_every ? null : 1,
    dtstart: new Date(shift.shifts_from),
    until: shift.shifts_to ? new Date(shift.shifts_to) : null,
  });
};

// SlotRrule is a RRuleSet that shows only free occurences
// Occurences with existing assignments are excluded
export const slotToRrule = (
  shift: ShiftsShift,
  shiftRule: RRule,
  assignments: ShiftsAssignment[],
  absences: ShiftsAbsence[],
): [RRule, AssignmentRrule[]] => {
  const assignmentRules: AssignmentRrule[] = [];
  const slotRule = new RRuleSet();
  slotRule.rrule(shiftRule);

  for (const assignment of assignments) {
    const assignmentRule = new RRuleSet();

    assignmentRule.rrule(
      new RRule({
        freq: RRule.DAILY,
        interval: shift.shifts_repeats_every,
        dtstart: shiftRule.after(new Date(assignment.shifts_from), true),
        until: assignment.shifts_to
          ? shiftRule.before(new Date(assignment.shifts_to), true)
          : null,
      }),
    );

    const filteredAbsences = absences.filter(
      (absence) =>
        (absence.shifts_assignment == assignment.id ||
          absence.shifts_assignment == null) &&
        absence.shifts_membership == assignment.shifts_membership.id,
    );

    for (const absence of filteredAbsences) {
      const absenceRule = new RRule({
        freq: RRule.DAILY,
        interval: shift.shifts_repeats_every,
        dtstart: shiftRule.after(new Date(absence.shifts_from), true),
        until: shiftRule.before(new Date(absence.shifts_to), true),
      });
      absence._rrule = absenceRule;
      absence.shifts_assignment = assignment;
      assignmentRule.exrule(absenceRule);
    }

    assignmentRules.push({
      assignment: assignment,
      absences: filteredAbsences,
      rrule: assignmentRule,
    });
    // console.log("assignmentRule", shift.shifts_name);
    // Exclude assignment from slotRules
    slotRule.exrule(assignmentRule);
  }
  // console.log("rules", assignmentRules);
  return [slotRule, assignmentRules];
};

export const isShiftDurationModelActive = (
  durationModel: { shifts_from: string; shifts_to?: string },
  atDate?: DateTime,
): boolean => {
  return isFromToActive(
    DateTime.fromISO(durationModel.shifts_from),
    durationModel.shifts_to
      ? DateTime.fromISO(durationModel.shifts_to)
      : undefined,
    atDate,
    true,
  );
};

export const isFromToActive = (
  from: DateTime,
  to?: DateTime,
  atDate?: DateTime,
  dateOnly = true,
): boolean => {
  if (!atDate) {
    atDate = DateTime.now();
  }

  if (dateOnly) {
    from = from.startOf("day");
    to = to?.endOf("day");
  }

  if (from > atDate) {
    return false;
  }

  return !(to && to < atDate);
};
