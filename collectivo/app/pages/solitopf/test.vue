<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setPageTitle(t("Soli-Topf Test"), {
  backLink: "/solitopf",
  backLinkLabel: t("Zurück zu den Soli-Topf Infos"),
});
</script>

<template>
  <BetaMessage />
  <SolitopfSoliTest />
</template>

<i18n lang="yaml">
en:
  "Soli-Topf Test": "Solidarity Fund Test"
</i18n>
