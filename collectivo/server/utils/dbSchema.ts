import { DirectusUser } from "@directus/sdk";

export interface DbSchema {
  directus_users: UserProfile[];
  collectivo_tags: Tag[];
  memberships: Membership[];
  collectivo_tiles: DashboardTile[];
  memberships_coshoppers: MembershipsCoshopper[];
  shifts_assignments: ShiftsAssignment[];
  shifts_absences: ShiftsAbsence[];
  shifts_logs: ShiftsLog[];
  shifts_shifts: ShiftsShift[];
  shifts_categories: ShiftsCategory[];
  shifts_holidays_public: ShiftsPublicHoliday[];
  settings_hidden: SettingsHidden;
  milaccess_log: CheckinLogEntry[];
  bedarfsmeldung_solitopf: BedarfsmeldungSolitopf[];
  product_requests: ProductRequests[];
}

export interface UserProfile {
  collectivo_tags: { collectivo_tags_id: number }[];
  memberships: number[] | Membership[];
  memberships_phone: string;
  hide_name: boolean;
  send_notifications: boolean;
  username: string;
  username_last: string;
  pronouns: string;
  buddy_status: "keine_angabe" | "is_buddy" | "need_buddy";
  buddy_details: string;
  lotzapp_id: string;
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
  shifts_user_type: ShiftsUserType;
  shifts_counter: number;
  shifts_logs: ShiftsLog[];
  shifts_can_be_coordinator: boolean;
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
  shifts_date: "datetime";
  shifts_score: number;
  shifts_shift?: ShiftsShift | number;
}

export interface ShiftsCategory {
  id: number;
  name: string;
  for_all: boolean;
  beschreibung: string;
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
