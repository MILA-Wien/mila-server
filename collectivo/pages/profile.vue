<script setup lang="ts">
import { object, string, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";

definePageMeta({
  middleware: ["auth"],
});
const { t } = useI18n();
setPageTitle(t("Profile"));

const toast = useToast();
const userData = useCurrentUser();
const user = userData.value.user!;

const schema = object({
  first_name: string().required(t("First name")),
  last_name: string().required(t("Last name")),
  email: string().email(t("Email")).required(t("Email")),
  hide_name: string().optional(),
});

type Schema = InferType<typeof schema>;

const state = reactive({
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  hide_name: user.hide_name,
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log("Form submitted", event.data);
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
  <div id="mila-profile" class="flex flex-col gap-8">
    <MembershipsMembershipTile />

    <div>
      <h2>Persönliche Daten</h2>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormGroup :label="t('First name')" name="first_name">
          <UInput v-model="state.first_name" disabled />
        </UFormGroup>

        <UFormGroup :label="t('Last name')" name="last_name">
          <UInput v-model="state.last_name" disabled />
        </UFormGroup>

        <UFormGroup :label="t('Email')" name="email">
          <UInput v-model="state.first_name" disabled />
        </UFormGroup>

        <UFormGroup :label="t('Stay anonymous')" name="hide_name">
          <div
            class="flex items-center gap-2 p-4 rounded-sm bg-blue-50 text-sm"
          >
            <UToggle v-model="state.hide_name" />
            <div>
              {{ t("Do not show my name to other members on the platform.") }}
            </div>
          </div>
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
  "Do not show my name to other members on the platform.": "Zeige meinen Namen nicht anderen Mitgliedern auf der Plattform an."
  "Persönliche Daten": "Persönliche Daten"
  "Success": "Erfolg"
  "Erfolgreich gespeichert": "Erfolgreich gespeichert"
</i18n>
