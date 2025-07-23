<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const config = useRuntimeConfig();
const { t } = useI18n();
setPageTitle(t("Product requests"));
</script>

<template>
  <div class="flex flex-col gap-5">
    <CollectivoCard>
      <h2>{{ t("My requests") }}</h2>
      <div class="flex flex-wrap gap-4">
        <UButton
          color="green"
          to="/participate/product-requests/new"
          icon="i-heroicons-plus"
        >
          {{ t("Submit request") }}
        </UButton>
      </div>
    </CollectivoCard>
  </div>
</template>

<i18n lang="yaml">
de:
  Participate: Mitwirken
  "Product requests": "Sortimentswünsche"
  "Open request list": "Wunschliste öffnen"
  "Submit request": "Wunsch einreichen"
  "My requests": "Meine Wünsche"
  "Here you can submit requests for products that you would like to see in our store.": "Hier kannst du Wünsche für Produkte einreichen, die du gerne in unserem Supermarkt sehen würdest."
</i18n>
