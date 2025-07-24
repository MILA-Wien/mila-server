<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setPageTitle(t("Shifts calendar (admin)"));
</script>

<template>
  <ShiftsViewer :admin="true" />
</template>

<i18n lang="yaml">
de:
  "Shifts calendar (admin)": "Schichtkalender (Admin)"
</i18n>
