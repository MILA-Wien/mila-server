export interface AssignmentSkill {
  icon: string;
}

export interface ShiftSkill {
  icon: string;
  name_de: string;
  name_en: string;
}

export interface OccurrenceAssignment {
  assignmentId: number;
  membershipId: number;
  username: string;
  username_last: string;
  hide_name: boolean;
  buddy_status: "keine_angabe" | "is_buddy" | "need_buddy";
  skills: AssignmentSkill[];
  shifts_from: string;
  shifts_to?: string;
  shifts_shift: number;
  shifts_is_regular: boolean;
  isActive: boolean;
  isOneTime: boolean;
  isSelf: boolean;
  absences: { id?: number; shifts_from: string; shifts_to: string }[];
  adminData: {
    email: string;
    memberships_phone: string;
    shifts_assignments_count: number;
  } | null;
}

export interface OccurrenceShift {
  id: number;
  shifts_name: string;
  shifts_slots: number;
  shifts_is_regular: boolean;
  shifts_is_all_day: boolean;
  shifts_from_time?: string;
  shifts_to_time?: string;
  shifts_description?: string;
  shifts_category_2?: number;
  shifts_repeats_every?: number;
  shifts_location?: string;
  exclude_public_holidays?: boolean;
}

export interface ShiftOccurrenceResponse {
  shift: OccurrenceShift;
  start: string;
  end: string;
  n_assigned: number;
  selfAssigned: boolean;
  assignments: OccurrenceAssignment[];
}

export interface OccurrencesApiResponse {
  occurrences: ShiftOccurrenceResponse[];
  publicHolidays: { date: string }[];
  skills: ShiftSkill[];
}
