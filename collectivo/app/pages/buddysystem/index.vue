<script setup lang="ts">
import { object, string, bool, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  middleware: ["auth"],
});
const { t } = useI18n();
setPageTitle(t("Buddysystem"), {
  backLink: "/",
  backLinkLabel: t("Zurück zur Startseite"),
});

const toast = useToast();
const userData = useCurrentUser();
const user = userData.value.user!;

const schema = object({
  buddy_status: string().oneOf(["need_buddy", "is_buddy", "keine_angabe"]),
});

type Schema = InferType<typeof schema>;

const state = reactive({
  buddy_status: user.buddy_status,
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await userData.value.save(event.data);
  } catch (error) {
    toast.add({
      title: "Error",
      description: "Fehler beim Speichern der Daten",
    });
    console.error(error);
    return;
  }
  toast.add({
    title: "Success",
    description: "Erfolgreich gespeichert",
  });
}
</script>

<template>
  <BetaMessage />
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-3">
      <h2 class="mb-0 pb-0">Was bedeutet Unterstützungs-Bedarf?</h2>

      <p>
        Menschen mit Unterstützungs-Bedarf benötigen Hilfe beim Mitmachen bei
        MILA.
        <br /><br />
        So können sie aktiv und wie alle anderen bei einer Fixschicht
        mitarbeiten.
        <br /><br />
        Der Grund für Unterstützungsbedarf ist unterschiedlich.
        <br /><br />
        Unterstützungsbedarf entsteht manchmal auch durch mehrere Dinge.
        <br /><br />
        Zum Beispiel können Barrieren bei MILA das Mitmachen erschweren.
        <br /><br />
        Vielleicht fühlst du dich mit einem Buddy sicherer.
        <br /><br />
        Vielleicht hast du mit einem Buddy weniger Stress.
        <br /><br />
        Wir verstehen Unterstützung als gemeinsamen Prozess.
        <br /><br />
        Dabei wollen wir die einzelnen Lebensumstände und Bedürfnisse beachten.
        <br /><br />
        Durch die Mitmach-Schichten kann jede*r selbstbestimmt und auf Augenhöhe
        teilhaben.
      </p>
    </div>
    <div>
      <h2>Mein Status</h2>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormGroup name="buddysystem_need_buddy">
          <FormsSingleChoice
            v-model="state.buddy_status"
            :options="[
              {
                label:
                  'Ich brauche Unterstützung. Ein Buddy soll mich während der Fixschicht unterstützen. Ein Buddy ist ein anderes MILA-Mitglied. Eine Fixschicht wiederholt sich alle 4 Wochen.',
                value: 'need_buddy',
              },
              {
                label:
                  'Ich kann mir vorstellen eine Person mit Unterstützungs-Bedarf in meiner Fixschicht als Buddy zu begleiten.',
                value: 'is_buddy',
              },
              {
                label: 'Keine Angabe.',
                value: 'keine_angabe',
              },
            ]"
          />
        </UFormGroup>

        <UButton type="submit"> {{ t("Aktualisieren") }} </UButton>
      </UForm>
    </div>
  </div>
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
