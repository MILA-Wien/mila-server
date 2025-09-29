<script setup lang="ts">
import MobileProfileMenu from "./MobileProfileMenu.vue";

const pageTitle = usePageTitle();
const { t } = useI18n();
</script>

<template>
  <div>
    <div
      class="h-[68px] px-[25px] pt-[24px] md:hidden flex gap-2 items-start justify-between w-screen"
    >
      <div class="text-2xl font-Avory truncate">
        {{ t(pageTitle) }}
      </div>
      <div class="pt-px"><MobileProfileMenu /></div>
    </div>
  </div>
</template>
