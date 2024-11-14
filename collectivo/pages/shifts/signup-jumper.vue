<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setCollectivoTitle(t("Sign up for a one-time shift"), {
  backLink: "dashboard",
});

definePageMeta({
  middleware: ["auth"],
});
</script>

<template>
  <ShiftsCalendar mode="jumper" />
</template>

<i18n lang="yaml">
de:
  "Sign up for a one-time shift": "Einmalige Schicht eintragen"
</i18n>
