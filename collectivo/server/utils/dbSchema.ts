
export interface DbSchema {
  directus_users: UserProfile[];
  collectivo_tags: Tag[];
  memberships: Membership[];
  collectivo_tiles: DashboardTile[];
  collectivo_tiles_buttons: DashboardTileButton[];
  memberships_coshoppers: MembershipsCoshopper[];
  memberships_memberships_coshoppers: {
    id: number;
    memberships_id: number;
    memberships_coshoppers_id: number;
  }[];
  shifts_assignments: ShiftsAssignment[];
  shifts_absences: ShiftsAbsence[];
  shifts_logs: ShiftsLog[];
  shifts_shifts: ShiftsShift[];
  shifts_skills: ShiftsSkill[];
  memberships_shifts_skills: { id: number; memberships_id: number; shifts_skills_id: number }[];
  shifts_categories: ShiftsCategory[];
  shifts_holidays_public: ShiftsPublicHoliday[];
  settings_hidden: SettingsHidden;
  solitopf: Solitopf;
  milaccess_log: CheckinLogEntry[];
  bedarfsmeldung_solitopf: BedarfsmeldungSolitopf[];
  product_requests: ProductRequests[];
  mila_automations: MilaAutomation[];
  messages_templates: MessageTemplate[];
  messages_campaigns: MessageCampaign[];
  messages_messages: MessageMessage[];
  collectivo_tags_directus_users: {
    id: number;
    collectivo_tags_id: number;
    directus_users_id: string;
  }[];
  payments_invoices_out: PaymentInvoiceOut[];
}

export interface UserProfile {
  id: string;
  collectivo_tags?: { collectivo_tags_id: number }[];
  memberships?: number[] | Membership[];
  role: { name: string };
  email: string;
  // Visible name
  username: string;
  username_last: string;
  pronouns: string;
  hide_name: boolean;
  send_notifications: boolean;
  buddy_status: "keine_angabe" | "is_buddy" | "need_buddy";
  buddy_details: string | undefined;
  lotzapp_id: string;
  // Directus auth fields
  first_name?: string;
  last_name?: string;
  provider?: string;
  external_identifier?: string;
  // Personal data
  memberships_person_type: "natural" | "legal";
  memberships_gender: string;
  memberships_phone: string;
  memberships_birthday: string;
  memberships_occupation: string;
  // Organization
  memberships_organization_name: string;
  memberships_organization_type: string;
  memberships_organization_id: string;
  // Address
  memberships_street: string;
  memberships_streetnumber: string;
  memberships_stair: string;
  memberships_door: string;
  memberships_postcode: string;
  memberships_city: string;
  memberships_country: string;
  // Payment
  payments_type: string;
  payments_account_iban: string;
  payments_account_owner: string;
}

export interface Tag {
  id: number;
  tags_name: string;
  tags_users: UserProfile[] | number[];
}

export type ShiftsUserType = "jumper" | "regular" | "exempt" | "inactive";

export interface Membership {
  id: number;
  name: string;
  memberships_user: UserProfile | number;
  memberships_status: string;
  memberships_type: string;
  memberships_shares: number;
  memberships_date_ended?: string;
  memberships_date_approved?: string;
  shifts_user_type: ShiftsUserType;
  shifts_counter: number;
  shifts_logs: ShiftsLog[];
  shifts_logs_count?: number;
  shifts_skills: { shifts_skills_id: ShiftsSkill | null }[];
  shifts_categories_allowed: { shifts_categories_id: number }[];
  memberships_card_id: string;
  coshoppers: { memberships_coshoppers_id: MembershipsCoshopper }[];
  kids: { memberships_coshoppers_id: MembershipsCoshopper }[];
}

export interface MembershipsCoshopper {
  id: number;
  first_name: string;
  last_name: string;
  membership_card_id: string;
  email?: string;
}

export interface DashboardTile {
  id: number;
  sort: number;
  tiles_name: string;
  tiles_content: string;
  tiles_buttons: DashboardTileButton[];
  tiles_color: string;
  tiles_component: string;
  tiles_tag_required: number | null;
  tiles_view_for:
    | "all"
    | "members"
    | "members-active"
    | "members-investing"
    | "non-members"
    | "hide";
}

export interface DashboardTileButton {
  id: number;
  tiles_label: string;
  tiles_path: string;
  tiles_is_external: boolean;
}

export interface SettingsHidden {
  last_cronjob: string;
  shift_point_system: boolean;
}

export interface Solitopf {
  funds_available: number;
  total_received: number;
  total_distributed: number;
}

export interface ShiftsSkill {
  id: number;
  icon: string;
  name_de: string;
  name_en: string;
}

export interface ShiftsShift {
  id: number;
  shifts_name: string;
  shifts_from: string;
  shifts_to?: string;
  shifts_is_all_day: boolean;
  shifts_from_time?: string;
  shifts_to_time?: string;
  shifts_slots: number;
  shifts_allow_self_assignment: boolean;
  shifts_is_regular: boolean;
  shifts_category_2?: number;
  shifts_repeats_every?: number;
  shifts_status: string;
  shifts_description?: string;
  shifts_location?: string;
  shifts_assignments?: ShiftsAssignment[] | number[];
  exclude_public_holidays?: boolean;
}

export interface ShiftsPublicHoliday {
  id: number;
  name: string;
  date: string;
}

export interface ShiftsAssignment {
  id: number;
  shifts_is_regular: boolean;
  shifts_from: "datetime" | string;
  shifts_to?: "datetime" | string;
  shifts_shift: ShiftsShift | number;
  shifts_membership: Membership | number;
}

/** Assignment with computed RRule data for occurrence calculation */
export interface AssignmentRrule {
  shift: ShiftsShift;
  assignment: ShiftsAssignment;
  absences: { absence: ShiftsAbsence; rrule: import("rrule").RRule }[];
  rrule: import("rrule").RRuleSet;
  rruleWithAbsences: import("rrule").RRuleSet;
}

export interface ShiftsAbsence {
  id?: number;
  shifts_from: "datetime" | string;
  shifts_to: "datetime" | string;
  shifts_assignment?: number | ShiftsAssignment;
  shifts_membership: Membership | number;
  shifts_is_for_all_assignments: boolean;
  shifts_is_holiday?: boolean;
}

export interface ShiftsLog {
  id?: number;
  shifts_membership: Membership | number;
  shifts_type: string;
  shifts_note: string;
  shifts_date: string;
  shifts_score: number;
  shifts_shift?: ShiftsShift | number;
}

export interface ShiftsCategory {
  id: number;
  name: string;
  for_all?: boolean;
  beschreibung?: string;
}

export interface CheckinLogEntry {
  id: number;
  membership: Membership | number;
  date: string;
  coshopper: MembershipsCoshopper | number;
}

export interface BedarfsmeldungSolitopf {
  id: number;
  membership: number | Membership;
  auszahlung: "v300a1" | "v50a6";
  weitere_unterstuetzung: boolean;
  date_created: string;
  status: "warteliste" | "angenommen" | "abgelehnt";
  anmerkung: string;
  first_payout: string | null;
}

export interface ProductRequests {
  id: number;
  name: string;
  wunsch: string;
  wunsch_von?: Membership | number;
  antwort: string;
  date_created: string;
  status: "inarbeit" | "habensimilar" | "gehtnicht" | "bereitsda" | "erledigt";
}

export interface MilaAutomation {
  id: number;
  mila_label: string;
  mila_key: string;
  mila_active: boolean;
  mila_template: MessageTemplate | number | null;
}

export interface MessageTemplate {
  id: number;
  messages_name: string;
  messages_subject: string | null;
}

export interface MessageCampaign {
  id: number;
  messages_campaign_status?: string;
  [key: string]: unknown;
}

export interface MessageMessage {
  id: number;
  [key: string]: unknown;
}

export interface PaymentInvoiceOut {
  id: number;
  [key: string]: unknown;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/** Narrows a Directus relation field from `UserProfile | number` to `UserProfile`. */
export function isUserProfile(v: UserProfile | number): v is UserProfile {
  return typeof v === "object";
}

/** Narrows a Directus relation field from `ShiftsShift | number` to `ShiftsShift`. */
export function isShiftsShift(v: ShiftsShift | number): v is ShiftsShift {
  return typeof v === "object";
}

/** Narrows a Directus relation field from `ShiftsAssignment | number` to `ShiftsAssignment`. */
export function isShiftsAssignment(
  v: ShiftsAssignment | number | undefined,
): v is ShiftsAssignment {
  return typeof v === "object";
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Directus aggregate query response shape for countDistinct operations.
 * Example: aggregate("table", { aggregate: { countDistinct: "field" } })
 * returns Array<{ countDistinct: Record<"field", number> }>
 */
export type AggregateResult<T extends string> = Array<{
  countDistinct: Record<T, number>;
}>;
