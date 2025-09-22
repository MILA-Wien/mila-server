<script setup lang="ts">
import { object, string, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  middleware: ["auth"],
});
const { t } = useI18n();
setPageTitle(t("Neue Sortimentsidee"), {
  backLink: "/sortiment/ideen",
  backLinkLabel: t("Zurück zum Ideenbuch"),
});

const toast = useToast();

const schema = object({
  name: string().required(),
  wunsch: string().required(),
});

type Schema = InferType<typeof schema>;

const state = reactive({
  name: "",
  wunsch: "",
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  await useFetch("/api/ideenbuch", {
    method: "POST",
    body: JSON.stringify(event.data),
    onResponse({ response }) {
      if (!response.ok) {
        toast.add({
          title: "Error",
          description: "Etwas ist schiefgelaufen.",
        });
        return;
      }
      toast.add({
        title: "Error",
        description: "Danke für deine Idee!",
      });
      navigateTo("/sortiment/ideen");
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
        <UFormGroup :label="t('Name of the product')" name="name">
          <UInput v-model="state.name" />
        </UFormGroup>

        <UFormGroup :label="t('Describe the product')" name="wunsch">
          <div>
            <p class="text-sm text-gray-500 pb-2">
              {{ t("t:description-wunsch") }}
            </p>
          </div>
          <UTextarea v-model="state.wunsch" />
        </UFormGroup>

        <div class="text-sm text-gray-500">{{ t("t:waittime") }}</div>
        <UButton type="submit"> {{ t("Einreichen") }} </UButton>
      </UForm>
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  Participate: Mitwirken
  "Name of the product": "Name des Produkts"
  "Product requests": "Sortimentswünsche"
  "Here you can submit requests for products that you would like to see in our store.": "Hier kannst du Wünsche für Produkte einreichen, die du gerne in unserem Supermarkt sehen würdest."
  "New product request": "Neuer Sortimentswunsch"
  "Describe the product": "Beschreibe das Produkt"
  "t:waittime": "Gib uns bitte 4-6 Wochen Zeit für eine Antwort"
  "t:description-wunsch": "Bitte so viele Infos wie möglich: Name, Verpackungseinheit, Produzent*in, Qualitätskriterien (Bio, Herkunft, Verpackungsart, usw) – Umso genauer, umso besser!"
en:
  "t:waittime": "Please give us 4-6 weeks to respond"
  "t:description-wunsch": "Please provide as much information as possible: Name, packaging unit, producer, quality criteria (organic, origin, packaging type, etc.) - The more accurate, the better!"
</i18n>
