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
  name: string().required("Dieses Feld ist erforderlich"),
  wunsch: string().required("Dieses Feld ist erforderlich"),
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
          title: "Etwas ist schiefgelaufen.",
        });
        return;
      }
      toast.add({
        title: "Danke für deine Idee!",
      });
      navigateTo("/sortiment/ideen");
    },
  });
}

async function onError() {
  toast.add({
    title: "Bitte alle Felder ausfüllen.",
    color: "error",
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
        @error="onError"
      >
        <FormsFormGroup :label="t('Name of the product')" name="name">
          <UInput v-model="state.name" />
        </FormsFormGroup>

        <FormsFormGroup :label="t('Describe the product')" name="wunsch">
          <template #description>
            {{ t("t:description-wunsch") }}
          </template>
          <UTextarea v-model="state.wunsch" :rows="12" />
        </FormsFormGroup>

        <div>{{ t("t:waittime") }}</div>
        <UButton type="submit"> {{ t("Idee einreichen") }} </UButton>
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
  "t:waittime": "Gib uns bitte 4-6 Wochen Zeit für eine Antwort."
  "t:description-wunsch": "Bitte so viele Infos wie möglich: Name, Verpackungseinheit, Produzent*in, Qualitätskriterien (Bio, Herkunft, Verpackungsart, usw) – Umso genauer, umso besser!"
en:
  "Idee einreichen": "Submit idea"
  "t:waittime": "Please give us 4-6 weeks to respond."
  "t:description-wunsch": "Please provide as much information as possible: Name, packaging unit, producer, quality criteria (organic, origin, packaging type, etc.) - The more accurate, the better!"
</i18n>
