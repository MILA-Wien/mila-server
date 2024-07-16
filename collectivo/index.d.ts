import type { DirectusRole } from "@directus/sdk";
import type { ShiftLogType } from "~/server/utils/ShiftLogType";
import type { DateTime } from "luxon";
import type { ItemStatus } from "@collectivo/collectivo/server/utils/directusFields";

declare global {
  interface CollectivoSchema {
    shifts_slots: ShiftsSlot[];
    shifts_skills: ShiftsSkill[];
    shifts_assignments: ShiftsAssignment[];
    shifts_absences: ShiftsAbsence[];
    shifts_logs: ShiftsLog[];
    shifts_shifts: ShiftsShift[];
    shifts_skills_directus_users: ShiftsSkillUserLink[];
    shifts_skills_shifts_slots: ShiftsSkillSlotLink[];
  }

  export type ShiftsUserType = "jumper" | "regular" | "exempt" | "inactive";

  export interface CollectivoUser {
    shifts_user_type: string;
    shifts_skills: number[];
  }

  export interface ShiftsShift {
    id?: string;
    shifts_name: string;
    shifts_from: string;
    shifts_to?: string;
    shifts_from_time?: string;
    shifts_to_time?: string;
    shifts_repeats_every?: number;
    shifts_slots?: ShiftsSlot[] | number[];
    shifts_status: ItemStatus;
    shifts_description?: string;
    shifts_location?: string;
  }

  export interface ShiftsSlot {
    id: number;
    shifts_name?: string;
    shifts_shift: ShiftsShift | number;
    shifts_skills: ShiftsSkillSlotLink[] | number[];
    shifts_assignments: ShiftsAssignment[] | number[];
  }

  export interface ShiftsAssignment {
    id?: number;
    shifts_from: string;
    shifts_to?: string;
    shifts_slot: ShiftsSlot | number;
    shifts_membership: MembershipsMembership | number;
  }

  export interface ShiftsAssignmentRules {
    assignment: ShiftsAssignment;
    absences: ShiftsAbsence[];
    assignmentRule: RRuleSet;
    absencesRule: RRuleSet;
    nextOccurrence: Date | null;
    isRegular: boolean;
  }

  export interface ShiftsAbsence {
    id?: number;
    shifts_from: string;
    shifts_to: string;
    shifts_assignment?: number;
    shifts_membership: MembershipsMembership | number;
  }

  export interface ShiftsSkill {
    id: number;
    shifts_name: string;
    shifts_slots: string[];
  }

  export interface ShiftsLog {
    id?: number;
    shifts_type: ShiftLogType;
    shifts_date: string;
    shifts_assignment?: ShiftsAssignment;
    shifts_membership: string;
  }

  export interface ShiftOccurrence {
    shift: ShiftsShift;
    start: DateTime;
    end: DateTime;
    slots: number;
    openSlots: number[];
    shiftRule: RRuleSet;
  }

  export interface ShiftsSkillUserLink {
    id?: string;
    shifts_skills_id: number;
    directus_users_id: string;
  }

  export interface ShiftsSkillSlotLink {
    id?: string;
    shifts_skills_id: number;
    shifts_slot_id: number;
  }

  interface CollectivoSchema {
    collectivo_extensions: CollectivoExtension[];
    collectivo_tiles: CollectivoTile[];
    collectivo_tags: CollectivoTag[];
    directus_users: CollectivoUser[];
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
    role?: DirectusRole;
    collectivo_tags: { collectivo_tags_id: number }[];
    memberships: MembershipsMembership[];
    [key: string]: string | undefined;
  }

  interface MembershipsMembership {
    id: number;
    name: string;
    memberships_user: DirectusUser | number;
    memberships_status: string;
    memberships_type: string;
    memberships_shares: number;
    shifts_user_type: ShiftsUserType;
    shifts_skills: { shifts_skills_id: ShiftsSkill }[];
    shifts_counter: number;
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
    tiles_status: "published" | "draft" | "archived";
    tiles_buttons: CollectivoTileButton[];
    tiles_color: string;
    tiles_component: string;
    tiles_tag_required: number | null;
    tiles_tag_blocked: number | null;
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
    order?: number; // Default 100
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
