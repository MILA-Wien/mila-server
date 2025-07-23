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
      <h2>{{ t("Product requests") }}</h2>
      <p class="mb-3">
        {{
          t(
            "Here you can submit requests for products that you would like to see in our store.",
          )
        }}
      </p>
      <div class="flex flex-wrap gap-4">
        <a href="/product-requests">
          <UButton color="green">{{ t("Submit request") }}</UButton>
        </a>
        <!-- <a href="https://handbuch.mila.wien/books/it-handbuch" target="_blank">
        <UButton>{{ t("IT Handbook") }}</UButton>
      </a> -->
      </div>
    </CollectivoCard>
  </div>
</template>

<i18n lang="yaml">
de:
  Participate: Mitwirken
  "Product requests": "Sortimentswünsche"
  "Here you can submit requests for products that you would like to see in our store.": "Hier kannst du Wünsche für Produkte einreichen, die du gerne in unserem Supermarkt sehen würdest."
</i18n>
