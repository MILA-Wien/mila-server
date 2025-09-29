<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const { setLocale, t } = useI18n();
const user = useCurrentUser();
const runtimeConfig = useRuntimeConfig();

const languageMenu: Ref<DropdownMenuItem[]> = ref([
  {
    label: "Deutsch",
    onSelect: () => {
      setLocale("de");
    },
  },
  {
    label: "English",
    onSelect: () => {
      setLocale("en");
    },
  },
]);

const profileMenu = ref<DropdownMenuItem[]>([
  {
    label: "Profile",
    icon: "i-heroicons-user-circle",
    to: "/profile/",
  },
]);

if (user.value.isStudioAdmin) {
  profileMenu.value.push({
    label: "Datenstudio",
    icon: "i-heroicons-chart-bar-square",
    to: runtimeConfig.public.directusUrl,
    target: "_blank",
  });
}
if (user.value.isShiftAdmin) {
  profileMenu.value.push({
    label: "Schichtverwaltung",
    icon: "i-heroicons-calendar-days-solid",
    to: "/shifts/admin",
  });
}

profileMenu.value.push({
  label: "Logout",
  icon: "i-heroicons-arrow-left-on-rectangle-solid",
  to: "/logout",
});
</script>

<template>
  <div class="flex flex-row gap-2">
    <UDropdownMenu :items="languageMenu" :popper="{ placement: 'bottom-end' }">
      <UIcon
        class="h-7 w-7 cursor-pointer"
        name="i-heroicons-language-20-solid"
      />

      <template #item="{ item }">
        <UIcon v-if="item.icon" class="h-5 w-5" :name="item.icon" />
        <span>{{ t(item.label as string) }}</span>
      </template>
    </UDropdownMenu>

    <UDropdownMenu :items="profileMenu" :popper="{ placement: 'bottom-end' }">
      <UIcon class="h-7 w-7 cursor-pointer" name="i-heroicons-user-circle" />

      <template #item="{ item }">
        <UIcon v-if="item.icon" class="h-5 w-5" :name="item.icon" />
        <span>{{ t(item.label as string) }}</span>
      </template>
    </UDropdownMenu>
  </div>
</template>
