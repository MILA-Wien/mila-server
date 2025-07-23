<script setup lang="ts">
import { object, string, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  middleware: ["auth"],
});
const { t } = useI18n();
setPageTitle(t("New product request"));

const toast = useToast();

const schema = object({
  wunsch: string().required(),
});

type Schema = InferType<typeof schema>;

const state = reactive({
  wunsch: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  await useFetch("/api/product-requests", {
    method: "POST",
    body: JSON.stringify(event.data),
    onResponse({ request, response, options }) {
      if (!response.ok) {
        toast.add({
          title: "Error",
          description: "Fehler beim Speichern der Daten",
        });
        return;
      }
      toast.add({
        title: "Success",
        description: "Erfolgreich gespeichert",
      });
      // navigateTo("/participate/product-requests");
    },
  });
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormGroup
          :label="t('Describe the product that you want')"
          name="wunsch"
        >
          <div>
            <p class="text-sm text-gray-500 pb-2">
              {{ t("t:description-wunsch") }}
            </p>
          </div>
          <UTextarea v-model="state.wunsch" />
        </UFormGroup>

        <UButton type="submit"> {{ t("Einreichen") }} </UButton>
      </UForm>
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  Participate: Mitwirken
  "Product requests": "Sortimentswünsche"
  "Here you can submit requests for products that you would like to see in our store.": "Hier kannst du Wünsche für Produkte einreichen, die du gerne in unserem Supermarkt sehen würdest."
  "New product request": "Neuer Sortimentswunsch"
  "Describe the product that you want": "Beschreibe das Produkt, das du dir wünschst"
  "t:description-wunsch": "Bitte so viele Infos wie möglich: Name, Verpackungseinheit, Produzent*in, Qualitätskriterien (Bio, Herkunft, Verpackungsart, usw) – Umso genauer, umso besser!"
en:
  "t:description-wunsch": "Please provide as much information as possible: Name, packaging unit, producer, quality criteria (organic, origin, packaging type, etc.) - The more accurate, the better!"
</i18n>
