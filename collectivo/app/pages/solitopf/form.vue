<script setup lang="ts">
import { bool, object, string, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";
import { marked } from "marked";

definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setPageTitle(t("Geld aus dem Soli-Topf bekommen"), {
  backLink: "/solitopf",
  backLinkLabel: t("Zurück zu den Soli-Topf Infos"),
});

const toast = useToast();
const userData = useCurrentUser();

const schema = object({
  auszahlung: string().required(),
  weitere_unterstuetzung: bool(),
});

type Schema = InferType<typeof schema>;

const state = reactive({
  auszahlung: undefined,
  weitere_unterstuetzung: undefined,
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const res = await useFetch("/api/solitopf/bedarf", {
    method: "POST",
    body: JSON.stringify(event.data),
  });
  if (res.status.value === "success") {
    toast.add({
      title: t("Dein Antrag wurde erfolgreich eingereicht."),
    });
    await userData.value.reload();
    navigateTo("/solitopf");
  } else {
    toast.add({
      title: t("Es ist ein Fehler aufgetreten."),
      icon: "i-heroicons-exclamation-triangle",
    });
  }
}
</script>

<template>
  <BetaMessage />
  <UForm :schema="schema" :state="state" class="space-y-8" @submit="onSubmit">
    <FormsFormGroup name="auszahlung">
      <template #title>
        {{ t("Ich möchte Geld aus dem Soli-Topf bekommen.") }}
      </template>
      <template #description> {{ t("Für mich passt am besten:") }} </template>
      <URadioGroup
        v-model="state.auszahlung"
        variant="card"
        :items="[
          {
            label: t('Einmalig 300 €'),
            value: 'v300a1',
          },
          {
            label: t('50 € pro Monat für 6 Monate (auch insgesamt 300 €)'),
            value: 'v50a6',
          },
        ]"
      />
      <p class="mt-2">
        {{
          t(
            "Das Geld wird auf deine MILA-Mitgliedskarte geladen. Alle Angaben bleiben vertraulich.",
          )
        }}
      </p>
    </FormsFormGroup>

    <FormsFormGroup name="weitere_unterstuetzung">
      <template #title>
        {{ t("Was passiert nach den 6 Monaten?") }}
      </template>
      <template #description>
        {{
          t(
            "Wenn du danach weiterhin Geld aus dem Soli-Topf brauchst, kannst du dich nach 5 Monaten wieder bei uns melden.",
          )
        }}
      </template>
      <UCheckbox variant="card" v-model="state.weitere_unterstuetzung">
        <template #label>
          <div v-html="marked(t('t_extra_support'))" />
        </template>
      </UCheckbox>
    </FormsFormGroup>

    <div class="flex flex-wrap gap-3">
      <UButton type="submit" icon="i-heroicons-arrow-right">
        {{ t("Anfrage absenden") }}
      </UButton>
    </div>
  </UForm>
</template>

<i18n lang="yaml">
de:
  t_extra_support: |
    Ich weiß schon jetzt, dass ich auch nach den 6 Monaten weiter Unterstützung brauche 
    (z. B. wegen Mindestpension oder dauerhaft niedrigem Einkommen).  
    *→ Wir melden uns rechtzeitig bei dir.*

en:
  Geld aus dem Soli-Topf bekommen: "Receive money from the solidarity fund"
  Zurück zu den Soli-Topf Infos: "Back to the solidarity fund info"
  Ich möchte Geld aus dem Soli-Topf bekommen.: "I would like to receive money from the solidarity fund."
  Für mich passt am besten:: "The best option for me is:"
  Einmalig 300 €: "One-time 300 €"
  "50 € pro Monat für 6 Monate (auch insgesamt 300 €)": "50 € per month for 6 months (also a total of 300 €)"
  Das Geld wird auf deine MILA-Mitgliedskarte geladen. Alle Angaben bleiben vertraulich.: "The money will be loaded onto your MILA membership card. All information remains confidential."
  Was passiert nach den 6 Monaten?: "What happens after the 6 months?"
  Wenn du danach weiterhin Geld aus dem Soli-Topf brauchst, kannst du dich nach 5 Monaten wieder bei uns melden.: "If you still need money from the solidarity fund after that, you can contact us again after 5 months."
  t_extra_support: |
    I already know that I will need further support after the 6 months
    (e.g. due to minimum pension or permanently low income).  
    *→ We will contact you in time.*
  Anfrage absenden: "Submit request"
</i18n>
