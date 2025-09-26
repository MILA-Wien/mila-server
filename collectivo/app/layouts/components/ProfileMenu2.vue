<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const user = useCurrentUser();
const { t } = useI18n();
const runtimeConfig = useRuntimeConfig();

const items = ref<DropdownMenuItem[]>([
  {
    label: "Profile",
    icon: "i-heroicons-user-circle",
    to: "/profile/",
  },
]);

if (user.value.isStudioAdmin) {
  items.value.push({
    label: "Datenstudio",
    icon: "i-heroicons-chart-bar-square",
    to: runtimeConfig.public.directusUrl,
    target: "_blank",
  });
}
if (user.value.isShiftAdmin) {
  items.value.push({
    label: "Schichtverwaltung",
    icon: "i-heroicons-calendar-days-solid",
    to: "/shifts/admin",
  });
}

items.value.push({
  label: "Logout",
  icon: "i-heroicons-arrow-left-on-rectangle-solid",
  to: "/logout",
});
</script>

<template>
  <div class="flex justify-end">
    <div v-if="user.isAuthenticated">
      <UDropdownMenu :items="items" :popper="{ placement: 'bottom' }">
        <div class="flex flex-row items-center cursor-pointer">
          <span class="text-lg font-semibold">{{ user.user?.username }}</span>
          <UIcon name="i-heroicons-user-circle" class="h-7 w-7 ml-2" />
        </div>

        <template #item="{ item }">
          <UIcon v-if="item.icon" class="h-5 w-5" :name="item.icon" />
          <span>{{ t(item.label as string) }}</span>
        </template>
      </UDropdownMenu>
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

<i18n lang="yaml">
de:
  "Profile": "Profil"
  "Logout": "Abmelden"
  "Login": "Anmelden"
</i18n>
