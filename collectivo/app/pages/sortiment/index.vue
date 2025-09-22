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
      <h2>{{ t("Ideenbuch") }}</h2>
      <p class="mb-3">
        {{
          t(
            "Entdecke Ideen für neue Produkte und teile deine eigenen Vorschläge mit uns – welche Produkte würdest du dir in unserem Supermarkt wünschen? Wir sammeln alle Einreichungen und prüfen regelmäßig, welche davon wir umsetzen können.",
          )
        }}
      </p>
      <div class="flex flex-wrap gap-4">
        <UButton color="green" to="/sortiment/ideen">
          {{ t("Ideenbuch anzeigen") }}
        </UButton>
        <UButton
          color="gray"
          to="https://handbuch.mila.wien/books/mitglieder-handbuch/page/produkte-wunschen"
          target="_blank"
        >
          {{ t("Über das Ideenbuch") }}
        </UButton>
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
