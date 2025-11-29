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
  "Sortiment mitbestimmen": "Product range participation"
  "Was kaufst du noch woanders? Was braucht unser Supermarkt? Wir sammeln alle Vorschläge und prüfen regelmäßig, welche davon wir umsetzen können.": "What do you still buy elsewhere? What does our supermarket need? We collect all suggestions and regularly check which ones we can implement."
  "Zur digitalen Sortimentsmappe": "To the digital product range folder"
  "Aktuelles Sortiment (Coming soon)": "Current product range (Coming soon)"
</i18n>
