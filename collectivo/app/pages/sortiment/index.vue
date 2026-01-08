<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const config = useRuntimeConfig();
const { t } = useI18n();
setPageTitle(t("Sortiment"));
</script>

<template>
  <BetaMessage />
  <div class="flex flex-col gap-5">
    <CollectivoCard>
      <h2>{{ t("Sortiment mitbestimmen") }}</h2>
      <p class="mb-3">
        {{
          t(
            "Was kaufst du noch woanders? Was braucht unser Supermarkt? Wir sammeln alle Vorschläge und prüfen regelmäßig, welche davon wir umsetzen können.",
          )
        }}
      </p>
      <div class="flex flex-wrap gap-4">
        <UButton color="green" to="/sortiment/mitbestimmen">
          {{ t("Zur digitalen Sortimentsmappe") }}
        </UButton>
      </div>
    </CollectivoCard>

    <CollectivoCard>
      <h2>{{ t("Produkte vorbestellen") }}</h2>
      <p class="mb-3">
        {{ t("Hier kannst du ausgewählte Produkte vorbestellen.") }}
      </p>
      <div class="flex flex-wrap gap-4">
        <UButton color="green" to="/sortiment/vorbestellen">
          {{ t("Zum Webshop für Vorbestellung") }}
        </UButton>
      </div>
    </CollectivoCard>

    <CollectivoCard>
      <h2>{{ t("Unser aktuelles Sortiment") }}</h2>
      <p class="mb-3">
        {{ t("Hier kannst du unsere aktuellen Artikel und Preise einsehen.") }}
      </p>
      <div class="flex flex-wrap gap-4">
        <UButton color="green" to="/sortiment/aktuell">
          {{ t("Zum Sortiment") }}
        </UButton>
      </div>
    </CollectivoCard>
  </div>
</template>

<i18n lang="yaml">
en:
    "Sortiment": "Product range"
    "Sortiment mitbestimmen": "Help shape the product range"
    "Was kaufst du noch woanders? Was braucht unser Supermarkt? Wir sammeln alle Vorschläge und prüfen regelmäßig, welche davon wir umsetzen können.": "What do you still buy elsewhere? What does our supermarket need? We collect all suggestions and regularly assess which ones we can implement."
    "Zur digitalen Sortimentsmappe": "To the digital product range folder"
    "Produkte vorbestellen": "Pre-order products"
    "Hier kannst du ausgewählte Produkte vorbestellen.": "Here you can pre-order selected products."
    "Zum Webshop für Vorbestellung": "To the pre-order webshop"
    "Unser aktuelles Sortiment": "Our current product range"
    "Hier kannst du unsere aktuellen Artikel und Preise einsehen.": "Here you can view our current items and prices."
    "Zum Sortiment": "To product range"
</i18n>
