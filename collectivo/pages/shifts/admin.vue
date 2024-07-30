<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setCollectivoTitle(t("Shifts administration"));

definePageMeta({
  middleware: ["auth"],
});
</script>

<template>
  <CollectivoContainer>
    <ShiftsCalendar mode="admin" />
  </CollectivoContainer>
</template>

<i18n lang="yaml">
de:
  "Shifts administration": "Schichtverwaltung"
</i18n>
