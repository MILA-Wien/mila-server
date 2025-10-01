<script setup lang="ts">
const { data: meldungen } = await useFetch("/api/solitopf/bedarf");
const { t } = useI18n();
const isWaiting = computed(
  () =>
    meldungen.value &&
    meldungen.value.some((meldung) => meldung.status === "warteliste"),
);
</script>

<template>
  <UButton v-if="isWaiting" icon="i-heroicons-check" disabled color="purple">
    {{ t("Du bist bereits auf der Warteliste") }}
  </UButton>
  <UButton
    v-else
    to="/solitopf/form"
    icon="i-heroicons-arrow-right"
    color="purple"
  >
    {{ t("Zum Formular") }}
  </UButton>
</template>

<i18n lang="yaml">
en:
  "Du bist bereits auf der Warteliste": "You are already on the waiting list"
  "Zum Formular": "To the form"
</i18n>
