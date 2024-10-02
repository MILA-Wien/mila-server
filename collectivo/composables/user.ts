import { readMe, updateMe } from "@directus/sdk";
import type { RestClient } from "@directus/sdk";

export const useCollectivoUser = () => {
  const state = useState<CollectivoUserStore>("collectivo_user", () => {
    return new CollectivoUserStore();
  });

  return state;
};

const ISMEMBER_STATUS_LIST = ["approved", "in_exclusion", "in_cancellation"];
const SHIFT_ADMIN_ROLES = ["Administrator", "Mitgliederverwaltung"];
const STUDIO_ADMIN_ROLES = [
  "Administrator",
  "Mitgliederverwaltung",
  "Vorstand",
];

class CollectivoUserStore {
  user: CollectivoUser | null;
  membership: MembershipsMembership | null;
  tags: number[];
  fields: CollectivoFormField[];
  isAuthenticated: boolean;
  isShiftAdmin: boolean;
  isStudioAdmin: boolean;
  isMember: boolean;
  saving: boolean;
  loading: boolean;
  error: unknown;

  constructor() {
    this.user = null;
    this.membership = null;
    this.fields = [];
    this.tags = [];
    this.isAuthenticated = false;
    this.isShiftAdmin = false;
    this.isStudioAdmin = false;
    this.isMember = false;
    this.saving = false;
    this.loading = false;
    this.error = null;
  }

  async init(directus: RestClient<CollectivoSchema>) {
    this.user = (await directus.request(
      readMe({
        fields: [
          "*",
          "role.name",
          "memberships.*",
          "memberships.shifts_skills.shifts_skills_id.*",
          "collectivo_tags.collectivo_tags_id",
        ],
      }),
    )) as CollectivoUser;

    // Check if admin
    this.isShiftAdmin = SHIFT_ADMIN_ROLES.includes(this.user.role.name);
    this.isStudioAdmin = STUDIO_ADMIN_ROLES.includes(this.user.role.name);

    // Process tags
    for (const field of this.user.collectivo_tags ?? []) {
      this.tags.push(field.collectivo_tags_id);
    }
    delete this.user.collectivo_tags;

    // Process membership
    if (this.user.memberships && this.user.memberships.length > 0) {
      this.membership = this.user.memberships[0];
      if (ISMEMBER_STATUS_LIST.includes(this.membership.memberships_status)) {
        this.isMember = true;
      }
    }
    delete this.user.memberships;
  }

  async save(data: CollectivoUser) {
    const { $directus } = useNuxtApp();
    this.saving = true;
    await $directus?.request(updateMe(data));
    this.user = data;
    this.saving = false;
    return this;
  }

  async login(force: boolean = false) {
    if (useCollectivoUser().value.isAuthenticated === true && !force) return;
    return navigateTo("/login");
  }

  async logout() {
    return navigateTo("/logout");
  }
}
