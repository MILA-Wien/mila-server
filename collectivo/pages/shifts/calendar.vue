<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setCollectivoTitle(t("Shift calendar"), {
  backLink: "/shifts",
});

definePageMeta({
  middleware: ["auth"],
});
</script>

<template>
  <ShiftsViewer :filter="'unfilled'" />
</template>

<i18n lang="yaml">
de:
  "Shift calendar": "Schichtkalender"
  "Sign up for a one-time shift": "Einmalige Schicht eintragen"
</i18n>
