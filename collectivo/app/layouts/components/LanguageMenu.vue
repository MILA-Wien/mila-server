<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

const { setLocale } = useI18n();

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
</script>

<template>
  <div class="p-8 flex justify-center">
    <UDropdownMenu :items="languageMenu" :popper="{ placement: 'top' }">
      <div class="flex flex-row items-center cursor-pointer">
        <div class="font-bold flex flex-row items-center gap-2 justify-center">
          <UIcon name="i-heroicons-language-16-solid" class="text-2xl" />
          Language
        </div>
      </div>

      <template #item="{ item }">
        <UIcon v-if="item.icon" class="h-5 w-5" :name="item.icon" />
        <span>{{ item.label }}</span>
      </template>
    </UDropdownMenu>
  </div>
</template>
