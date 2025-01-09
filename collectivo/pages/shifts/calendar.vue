<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setPageTitle(t("Shift calendar"), {
  backLink: "/shifts",
  backLinkLabel: t("Back to overview"),
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
  "Back to overview": "Zurück zur Übersicht"
  "Sign up for a one-time shift": "Einmalige Schicht eintragen"
</i18n>
