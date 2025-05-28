declare global {
  interface DbSchema {
    directus_users: UserProfile[];
    collectivo_tags: UserTag[];
    memberships: MembershipsMembership[];
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
  }

  interface CheckinLogEntry {
    id: number;
    membership: MembershipsMembership | number;
    date: string;
    coshopper: MembershipsCoshopper | number;
  }

  interface UserProfile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    hide_name: boolean;
    collectivo_tags?: { collectivo_tags_id: number }[];
    memberships?: MembershipsMembership[];
    [key: string]: string | undefined;
  }

  interface UserTag {
    id: number;
    tags_name: string;
    tags_users: UserProfile[] | number[];
  }

  export type ShiftsUserType = "jumper" | "regular" | "exempt" | "inactive";

  interface MembershipsMembership {
    id: number;
    name: string;
    memberships_user: UserProfile | number;
    memberships_status: string;
    memberships_type: string;
    memberships_shares: number;
    shifts_user_type: ShiftsUserType;
    shifts_counter: number;
    shifts_logs?: ShiftsLog[];
    shifts_can_be_coordinator: boolean;
    shifts_categories_allowed: { shifts_categories_id: number }[];
    coshoppers?: { memberships_coshoppesr_id: MembershipsCoshopper }[];
    kids?: { memberships_coshoppesr_id: MembershipsCoshopper }[];
  }

  interface MembershipsCoshopper {
    id: number;
    first_name: string;
    last_name: string;
    membership_card_id: string;
  }

  interface DashboardTile {
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

  interface DashboardTileButton {
    id: number;
    tiles_label: string;
    tiles_path: string;
    tiles_is_external: boolean;
  }

  interface SettingsHidden {
    last_cronjob: string;
    shift_point_system: boolean;
  }

  // Shifts
  interface ShiftsFilter {
    label: string;
    value: string;
  }
  interface ShiftsFilterState {
    categories: ShiftsCategory[];
    selectedCategory: ShiftsCategory;
    displayUnfilled: boolean;
    displayNames: boolean;
    adminMode: boolean;
  }

  interface ShiftsShift {
    id: number;
    shifts_name: string;
    shifts_from: string;
    shifts_to?: string;
    shifts_is_all_day: boolean;
    shifts_from_time?: string;
    shifts_to_time?: string;
    shifts_slots: number;
    shifts_needs_coordinator: boolean;
    shifts_allow_self_assignment: boolean;
    shifts_is_regular: boolean;
    shifts_category_2?: number;
    shifts_repeats_every?: number;
    shifts_status: string;
    shifts_description?: string;
    shifts_location?: string;
    shifts_needs_coordinator: boolean;
    shifts_assignments?: ShiftsAssignment[] | number[];
    exclude_public_holidays?: boolean;
  }

  interface ShiftsShiftGet extends ShiftsShift {
    id: number;
  }

  interface ShiftsPublicHoliday {
    id: number;
    name: string;
    date: string;
  }

  interface ShiftsAssignment {
    id: number;
    shifts_is_regular: boolean;
    shifts_from: string;
    shifts_to?: string;
    shifts_shift: ShiftsShift | number;
    shifts_membership: MembershipsMembership | number;
    shifts_is_coordination: boolean;
    send_reminders: boolean;
  }

  interface ShiftsAssignmentGet extends ShiftsAssignment {
    id: number;
    shifts_membership: MembershipsMembership;
    shifts_shift: number;
  }

  interface ShiftsAssignmentGetFull extends ShiftsAssignmentGet {
    shifts_shift: ShiftsShift;
  }

  interface ShiftsAbsence {
    id?: number;
    shifts_from: string;
    shifts_to: string;
    shifts_assignment?: number | ShiftsAssignment;
    shifts_membership: MembershipsMembership | number;
    shifts_is_for_all_assignments: boolean;
    shifts_is_holiday?: boolean;
  }

  interface ShiftsAbsenceGet extends ShiftsAbsence {
    shifts_assignment: number;
  }

  interface ShiftsAssignmentInfos {
    assignment: ShiftsAssignmentGetFull;
    coworkers: string[];
    nextOccurrence: Date | null;
    nextOccurrenceAbsent: boolean | null;
    isRegular: boolean;
  }

  interface ShiftsAssignmentRules {
    assignment: ShiftsAssignmentGet;
    absences: ShiftsAbsenceGet[];
    assignmentRule: RRuleSet;
    absencesRule: RRuleSet;
    nextOccurrence: Date | null;
    isRegular: boolean;
  }

  interface ShiftsLog {
    id?: number;
    shifts_membership: MembershipsMembership | number;
    shifts_type: string;
    shifts_note: string;
    shifts_date: string;
    shifts_score: number;
    shifts_shift?: ShiftsShift | number;
  }

  interface ShiftsCategory {
    id: number;
    name: string;
  }

  interface ShiftOccurrenceApiResponse {
    occurrences: ShiftOccurrenceFrontend[];
    publicHolidays: ShiftsPublicHoliday[];
  }

  interface ShiftOccurrenceFrontend {
    shift: ShiftsShift;
    start: string;
    end: string;
    shiftRule: RRuleSet;
    n_assigned: number;
    assignments: AssignmentOccurrence[];
    selfAssigned?: boolean;
    needsCoordinator?: boolean;
  }

  interface ShiftOccurrence {
    shift: ShiftsShift;
    start: Date;
    end: Date;
    shiftRule: RRuleSet;
    n_assigned: number;
    assignments: AssignmentOccurrence[];
    selfAssigned?: boolean;
    needsCoordinator?: boolean;
  }

  interface AssignmentRrule {
    assignment: ShiftsAssignment;
    absences: AbsenceRrule[];
    shift?: ShiftsShift;
    rrule: RRule | RRuleSet;
    rruleWithAbsences: RRule | RRuleSet;
  }

  interface AbsenceRrule {
    absence: ShiftsAbsence;
    rrule: RRule | RRuleSet;
  }

  interface AssignmentOccurrence {
    assignment: ShiftsAssignment;
    absences: ShiftsAbsence[];
    isOneTime?: boolean;
    isActive?: boolean;
    isSelf?: boolean;
  }

  // Layout
  interface NavigationMenus {
    main: CollectivoMenuItem[];
    main_public: CollectivoMenuItem[];
    profile: CollectivoMenuItem[];
    profile_public: CollectivoMenuItem[];
  }

  interface CollectivoMenuItem {
    label: string;
    icon?: string;
    to?: string;
    click?: () => void;
    external?: boolean; // Defaults to false
    target?: string; // Default "_self"
    hideOnMobile?: boolean; // Default false
    filter?: (item: CollectivoMenuItem) => Promise<boolean> | boolean;
  }

  // Forms
  interface CollectivoForm {
    title: string;
    fields: CollectivoFormField[];
    public?: boolean;
    submitMode?: "postNuxt" | (() => void);
    submitPath?: string;
    submitLabel?: string;
    successTitle?: string;
    successText?: string;
    successIcon?: string;
    beforeSubmit?: (data: any) => any;
  }

  type CollectivoFormField = CollectivoFormLayout | CollectivoFormInput;

  interface CollectivoFormFieldBase {
    order: number;
    width?: "lg" | "md" | "sm";
    conditions?: CollectivoFormCondition[];
    _visible?: Ref<boolean>;
  }

  // These should not have a "key" property, because "key" is used to identify inputs
  type CollectivoFormLayout = CollectivoFormFieldBase &
    (
      | {
          type: "description";
          label?: string;
          description: string;
          boxed?: boolean;
        }
      | {
          type: "section";
          title?: string;
          icon?: string;
          description?: string;
        }
      | {
          type: "clear";
        }
      | {
          type: "custom-layout";
          component: any;
        }
    );

  type CollectivoFormInput = {
    type: string;
    key: string;
    label?: string;
    default?: any;
    required?: boolean;
    disabled?: boolean;
    validators?: FormValidator[];
    description?: string;
  } & CollectivoFormFieldBase &
    CollectivoFormInputType;

  type CollectivoFormInputType =
    | {
        type: "select";
        choices?: CollectivoFormInputChoice[];
        multiple?: boolean;
        expand?: boolean;
      }
    | {
        type: "text" | "number" | "email" | "password" | "textarea";
        placeholder?: string;
        icon?: string;
      }
    | {
        type: "date";
        useDatePicker?: boolean;
        maxYearsFuture?: number;
        maxYearsPast?: number;
      }
    | {
        type: "checkbox";
        content?: string;
      }
    | {
        type: "custom-input";
        component: any;
      };

  interface CollectivoFormInputChoice {
    value: string;
    label: string;
  }

  interface CollectivoFormCondition {
    type?: "==" | "authenticated" | "notAuthenticated";
    key?: string;
    value?: string | number | boolean;
  }

  type FormValidator = {
    type: "min" | "max" | "email" | "url" | "regex" | "iban";
    value?: string | number | RegExp;
    message?: string;
  };

  // Server middleware
  interface ServerUserInfo {
    user: string;
    email: string;
    mship: number | null;
    studioAdmin: boolean;
    shiftAdmin: boolean;
  }
}

// Types for input of app.config.ts
declare module "nuxt/schema" {
  interface AppConfigInput {}
}

// Server middleware
declare module "h3" {
  interface EventHandlerRequest {
    context: {
      auth?: ServerUserInfo;
    };
  }
}

export {};
