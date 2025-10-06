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
            "Welche Produkte würdest du gerne in unserem Supermarkt haben? Wir sammeln alle Vorschläge und prüfen regelmäßig, welche davon wir umsetzen können.",
          )
        }}
      </p>
      <div class="flex flex-wrap gap-4">
        <UButton color="green" to="/sortiment/mitbestimmen">
          {{ t("Zum Sortimentsbuch") }}
        </UButton>
      </div>
    </CollectivoCard>
    <CollectivoCard color="gray">
      <h2>{{ t("Aktuelles Sortiment (Coming soon)") }}</h2>
      <p class="mb-3">
        {{
          t(
            "Hier kannst du in Zukunft alle Produkte und Preise in unserem Supermarkt einsehen.",
          )
        }}
      </p>
      <div class="flex flex-wrap gap-4">
        <!-- <UButton color="green" to="/sortiment/mitbestimmen">
          {{ t("Zum Produktverzeichnis") }}
        </UButton> -->
      </div>
    </CollectivoCard>
  </div>
</template>

<i18n lang="yaml">
en:
  "Sortiment": "Product range"
  "Ideenbuch": "Product ideas"
  "Ideenbuch anzeigen": "View product ideas"
  "Neue Idee eintragen": "Submit new product idea"
</i18n>
