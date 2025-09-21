<script setup lang="ts">
import { bool, object, string, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  middleware: ["auth"],
});
const { t } = useI18n();
setPageTitle(t("Soli-Topf Antrag"), {
  backLink: "/solitopf",
  backLinkLabel: t("Zurück zu den Soli-Topf Infos"),
});

const toast = useToast();
const userData = useCurrentUser();
const user = userData.value.user!;

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
    headers: await getApiHeaders(),
    body: JSON.stringify(event.data),
  });

  if (res.status.value === "error") {
    toast.add({
      title: t("There was an error"),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
      timeout: 0,
    });
  } else {
    toast.add({
      title: "Success",
      description: "Erfolgreich abgesendet",
    });
    navigateTo("/solitopf");
  }
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-8" @submit="onSubmit">
    <UFormGroup name="auszahlung">
      <div class="font-bold mb-2">
        Ich möchte Unterstützung aus dem Soli-Topf erhalten.
      </div>
      <div class="mt-1 mb-3">Für mich passt am besten:</div>
      <FormsSingleChoice
        v-model="state.auszahlung"
        :options="[
          {
            label: t('Eine einmalige Auszahlung von 300 €.'),
            value: 'v300a1',
          },
          {
            label: t(
              'Eine monatliche Auszahlung von 50 € über 6 Monate (= insgesamt ebenfalls 300 €).',
            ),
            value: 'v50a6',
          },
        ]"
      />
    </UFormGroup>

    <UFormGroup name="weitere_unterstuetzung">
      <div class="font-bold">
        {{ t("Was passiert nach den 6 Monaten?") }}
      </div>
      <div class="mt-1 mb-3">
        Wenn du danach weiterhin Unterstützung brauchst, kannst du dich nach 5
        Monaten wieder bei uns melden.
      </div>
      <FormsCheckbox v-model="state.weitere_unterstuetzung">
        Ich weiß schon jetzt, dass ich auch nach den 6 Monaten weiter
        Unterstützung brauche (z. B. wegen Mindestpension oder dauerhaft
        niedrigem Einkommen). → Wir melden uns rechtzeitig bei dir.
      </FormsCheckbox>
    </UFormGroup>
    <div class="flex flex-wrap gap-3">
      <UButton type="submit" icon="i-heroicons-arrow-right">
        {{ t("Antrag einreichen") }}
      </UButton>
    </div>
  </UForm>
</template>

<i18n lang="yaml">
de:
  "Profile": "Profil"
  "First name": "Vorname"
  "Last name": "Nachname"
  "Email": "E-Mail"
  "Stay anonymous": "Anonym bleiben"
  "Do not show my name to other members on the platform.": "Verberge meinen Namen vor anderen Mitgliedern auf der Plattform."
  "Persönliche Daten": "Persönliche Daten"
  "Success": "Erfolg"
  "Error": "Fehler"
  "Erfolgreich gespeichert": "Erfolgreich gespeichert"
  "Send shift reminders": "Schicht-Erinnerungen senden"
  "Receive email notifications about upcoming shifts.": "Erhalte E-Mail-Benachrichtigungen über bevorstehende Schichten."
</i18n>
