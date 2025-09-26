<script setup lang="ts">
const user = useCurrentUser();
const { t } = useI18n();
const runtimeConfig = useRuntimeConfig();
const router = useRouter();

interface MenuItem {
  label: string;
  icon?: string;
  click?: () => void;
}

const profileMenu: Ref<MenuItem[][]> = ref([[]]);

const profileItems: CollectivoMenuItem[] = [
  {
    label: "Profile",
    icon: "i-heroicons-user-circle",
    to: "/profile/",
  },
];

const profilePublicItems: CollectivoMenuItem[] = [
  {
    label: "Login",
    icon: "i-heroicons-arrow-right-on-rectangle-solid",
    click: user.value.login,
  },
];

if (user.value.isStudioAdmin) {
  profileItems.push({
    label: "Datenstudio",
    icon: "i-heroicons-chart-bar-square",
    to: runtimeConfig.public.directusUrl,
    external: true,
  });
}
if (user.value.isShiftAdmin) {
  profileItems.push({
    label: "Schichtverwaltung",
    icon: "i-heroicons-calendar-days-solid",
    to: "/shifts/admin",
  });
}

profileItems.push({
  label: "Logout",
  icon: "i-heroicons-arrow-left-on-rectangle-solid",
  click: user.value.logout,
});

const items = user.value.isAuthenticated ? profileItems : profilePublicItems;

for (const item of items) {
  profileMenu.value[0].push({
    label: item.label,
    icon: item.icon,
    click:
      item.click ||
      (() => {
        if (item.external) {
          window.open(item.to, "_blank");
          return;
        }

        router.push(item.to ?? "/");
      }),
  });
}
</script>

<template>
  <div class="flex justify-end">
    <div v-if="user.isAuthenticated">
      <UDropdown :items="profileMenu" :popper="{ placement: 'bottom' }">
        <div class="flex flex-row items-center">
          <span class="text-lg font-semibold">{{ user.user?.username }}</span>
          <UIcon name="i-heroicons-user-circle" class="h-7 w-7 ml-2" />
        </div>

        <template #item="{ item }">
          <UIcon v-if="item.icon" class="h-5 w-5" :name="item.icon" />
          <span>{{ t(item.label) }}</span>
        </template>
      </UDropdown>
    </div>
    <div v-else>
      <NuxtLink to="/login">
        <div class="flex flex-row items-center">
          <UIcon name="i-heroicons-user-circle" class="h-7 w-7 mr-2" />
          <h4>{{ t("Login") }}</h4>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  "Profile": "Profil"
  "Logout": "Abmelden"
  "Login": "Anmelden"
</i18n>
