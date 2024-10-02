import type { DirectusRole } from "@directus/sdk";
import type { DateTime } from "luxon";

declare global {
  interface CollectivoSchema {
    collectivo_extensions: CollectivoExtension[];
    collectivo_tiles: CollectivoTile[];
    collectivo_tags: CollectivoTag[];
    directus_users: CollectivoUser[];
    memberships: MembershipsMembership[];
    shifts_slots: ShiftsSlot[];
    shifts_skills: ShiftsSkill[];
    shifts_assignments: ShiftsAssignment[];
    shifts_absences: ShiftsAbsence[];
    shifts_logs: ShiftsLog[];
    shifts_shifts: ShiftsShift[];
  }

  interface ShiftsShift {
    id?: number;
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
    shifts_category: string;
    shifts_repeats_every?: number;
    shifts_status: string;
    shifts_description?: string;
    shifts_location?: string;
    shifts_needs_coordinator: boolean;
    shifts_assignments?: ShiftsAssignment[] | number[];
  }

  interface ShiftsAssignment {
    id?: number;
    shifts_is_regular: boolean;
    shifts_from: string;
    shifts_to?: string;
    shifts_shift: ShiftsShift | number;
    shifts_membership: MembershipsMembership | number;
    shifts_is_coordination: boolean;
  }

  interface ShiftsAssignmentGet extends ShiftsAssignment {
    shifts_membership: number;
  }

  interface ShiftsAssignmentRules {
    assignment: ShiftsAssignment;
    absences: ShiftsAbsence[];
    assignmentRule: RRuleSet;
    absencesRule: RRuleSet;
    nextOccurrence: Date | null;
    isRegular: boolean;
  }

  interface ShiftsAbsence {
    id?: number;
    shifts_status: string;
    shifts_from: string;
    shifts_to: string;
    shifts_assignment?: number | ShiftsAssignment;
    shifts_membership: MembershipsMembership | number;
    shifts_is_for_all_assignments: boolean;
    shifts_is_holiday?: boolean;
    _rrule?: RRule | RRuleSet;
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

  interface ShiftOccurrence {
    shift: ShiftsShift;
    start: DateTime;
    end: DateTime;
    shiftRule: RRuleSet;
    n_assigned: number;
    assignments: AssignmentOccurrence[];
    selfAssigned?: boolean;
    needsCoordinator?: boolean;
  }

  interface SlotRrule {
    id: number;
    slot: ShiftsSlot;
    rrule: RRule | RRuleSet;
    assignments: AssignmentRrule[];
  }

  interface AssignmentRrule {
    assignment: ShiftsAssignment;
    absences: ShiftsAbsence[];
    shift?: ShiftsShift;
    rrule: RRule | RRuleSet;
    rruleWithAbsences: RRule | RRuleSet;
  }

  interface AssignmentOccurrence {
    assignment: ShiftsAssignment;
    absences: ShiftsAbsence[];
    isOneTime?: boolean;
    isActive?: boolean;
    logged?: boolean;
    removed?: boolean;
  }

  interface MembershipsMembership {
    id: number;
    name: string;
    memberships_user: DirectusUser | number;
    memberships_status: string;
    memberships_type: string;
    memberships_shares: number;
  }

  interface DataWrapper<T> {
    data: T | null | undefined;
    error: Error | null | undefined | unknown;
    loading: boolean;
    saving: boolean;
  }

  interface CollectivoUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    collectivo_tags?: { collectivo_tags_id: number }[];
    memberships?: MembershipsMembership[];
    role: { name: string };
    [key: string]: string | undefined;
  }

  export type ShiftsUserType = "jumper" | "regular" | "exempt" | "inactive";

  interface MembershipsMembership {
    id: number;
    name: string;
    memberships_user: DirectusUser | number;
    memberships_status: string;
    memberships_type: string;
    memberships_shares: number;
    shifts_user_type: ShiftsUserType;
    shifts_counter: number;
    shifts_skills?: string[];
    coshoppers?: { memberships_coshoppesr_id: MembershipsCoshopper }[];
    kids?: { memberships_coshoppesr_id: MembershipsCoshopper }[];
  }

  interface MembershipsCoshopper {
    id: number;
    first_name: string;
    last_name: string;
    membership_card_id: string;
  }

  interface CollectivoTag {
    id: number;
    tags_name: string;
    tags_users: CollectivoUser[] | number[];
  }

  interface CollectivoTile {
    id: number;
    sort: number;
    tiles_name: string;
    tiles_content: string;
    tiles_buttons: CollectivoTileButton[];
    tiles_color: string;
    tiles_component: string;
    tiles_tag_required: number | null;
    tiles_view_for: "all" | "members" | "non-members" | "hide";
  }

  interface CollectivoTileButton {
    id: number;
    tiles_label: string;
    tiles_path: string;
    tiles_is_external: boolean;
  }

  interface CollectivoExtension {
    id: number;
    extensions_name: string;
    extensions_version: string;
    extensions_schema_version: number;
    extensions_schema_is_latest: boolean;
  }

  interface CollectivoSettings {
    id: number;
    collectivo_project_name: string;
    collectivo_project_description: string;
    collectivo_members_role: string;
    collectivo_admin_role: string;
  }

  // Layout
  interface CollectivoMenus {
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
    // TODO: Add operator?: "==" | "!=" | ">" | "<" | ">=" | "<=";
  }

  type FormValidator =
    | {
        type: "min" | "max" | "email" | "url" | "regex";
        value?: string | number | RegExp;
        message?: string;
      }
    | {
        type: "test" | "transform";
        value: string;
        message?: string;
      };
}

// Types for input of app.config.ts
declare module "nuxt/schema" {
  interface AppConfigInput {}
}

export {};
