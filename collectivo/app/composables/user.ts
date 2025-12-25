import type { RestClient } from "@directus/sdk";

export const useCurrentUser = () => {
  const state = useState<CurrentUserStore>("collectivo_user", () => {
    return new CurrentUserStore();
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

class CurrentUserStore {
  user: UserProfile | null;
  membership: Membership | null;
  tags: number[];
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
    this.tags = [];
    this.isAuthenticated = false;
    this.isShiftAdmin = false;
    this.isStudioAdmin = false;
    this.isMember = false;
    this.saving = false;
    this.loading = false;
    this.error = null;
  }

  async init(directus: RestClient<DbSchema>) {
    const data = await useFetch("/api/profile");
    if (data.error.value) {
      this.error = data.error.value;
      return;
    }

    this.user = data.data as UserProfile;

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

  async reload() {
    const { $directus } = useNuxtApp();
    if (!$directus) throw new Error("Directus client not initialized");
    await this.init($directus);
  }

  async save(data: Partial<UserProfile>) {
    this.saving = true;
    await $fetch("/api/profile", {
      method: "PUT",
      body: data,
    });
    this.user = { ...this.user, ...data } as UserProfile;
    this.saving = false;
    return this;
  }

  async login(force: boolean = false) {
    if (useCurrentUser().value.isAuthenticated === true && !force) return;
    return navigateTo("/login");
  }

  async logout() {
    return navigateTo("/logout");
  }
}
