<script setup lang="ts">
const { t } = useI18n();
setPageTitle(t("Soli-Topf Test"));

definePageMeta({
  layout: "forms",
});
</script>

<template>
  <SolitopfSoliTest public />
</template>

<i18n lang="yaml">
en:
  "Soli-Topf Test": "Solidarity Fund Test"
</i18n>
