<script setup lang="ts">
const pageTitle = usePageTitle();
const { t } = useI18n();

const isDrawerOpen = defineModel<boolean>("drawerOpen", { default: false });
</script>

<template>
  <div>
    <div
      class="h-[68px] px-[25px] pt-[24px] md:hidden flex gap-2 items-start justify-between w-screen"
    >
      <div class="text-2xl font-Avory truncate">
        {{ t(pageTitle) }}
      </div>
      <button
        @click="isDrawerOpen = true"
        class="pt-px p-2 hover:bg-gray-100 rounded transition-all"
      >
        <UIcon name="i-heroicons-bars-3" class="h-7 w-7" />
      </button>
    </div>
  </div>
</template>
