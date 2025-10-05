<script setup lang="ts">
import { object, string, bool, type InferType } from "yup";
import type { FormSubmitEvent, FormErrorEvent } from "#ui/types";

definePageMeta({
  middleware: ["auth"],
});
const { t } = useI18n();
setPageTitle(t("Profile"));

const toast = useToast();
const userData = useCurrentUser();
const user = userData.value.user!;
const mv = "Dieses Feld ist erforderlich";
const schema = object({
  username: string().min(1, t(mv)).required(t(mv)),
  pronouns: string().optional(),
  hide_name: bool().optional(),
  send_notifications: bool().optional(),
});

type Schema = InferType<typeof schema>;

const state = reactive({
  username: user.username,
  pronouns: user.pronouns,
  hide_name: user.hide_name,
  send_notifications: user.send_notifications,
});

// Directus can return null values
// But zod and yup want undefined
Object.keys(state).forEach((key) => {
  if (state[key] === null) {
    state[key] = undefined;
  }
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const res = await useFetch("/api/profile", {
    method: "PUT",
    body: event.data,
  });
  if (res.status.value === "success") {
    await userData.value.reload();
    toast.add({
      title: t("Dein Profil wurde erfolgreich aktualisiert."),
      color: "success",
    });
  } else {
    toast.add({
      title: t("Es ist ein Fehler aufgetreten."),
      icon: "i-heroicons-exclamation-triangle",
      color: "error",
    });
  }
}

async function onError(event: FormErrorEvent) {
  toast.add({
    title: t("Some fields are not filled in correctly"),
    icon: "i-heroicons-exclamation-circle",
    color: "error",
  });
  if (event?.errors?.[0]?.id) {
    const element = document.getElementById(event.errors[0].id);
    element?.focus();
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
</script>

<template>
  <div id="mila-profile" class="flex flex-col gap-8">
    <MembershipsMembershipTile />

    <div>
      <h2>{{ t("Einstellungen") }}</h2>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
        @error="onError"
      >
        <FormsFormGroup
          :label="t('Wie sollen wir dich ansprechen?')"
          :infotext="
            t('Dieser Name kann sich von deinem amtlichen Namen unterscheiden.')
          "
          name="username"
          required
        >
          <template #description> </template>
          <UInput v-model="state.username" />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Mit welchen Pronomen möchtest du angesprochen werden?')"
          :infotext="t('i_pronouns')"
          name="pronouns"
        >
          <UInput variant="outline" v-model="state.pronouns" />
        </FormsFormGroup>

        <FormsFormGroup name="hide_name" :label="t('Anonym bleiben')">
          <UCheckbox variant="card" v-model="state.hide_name">
            <template #label>
              {{
                t(
                  "Verberge meinen Namen vor anderen Mitgliedern auf der Plattform.",
                )
              }}</template
            >
          </UCheckbox>
        </FormsFormGroup>

        <FormsFormGroup
          name="send_notifications"
          :label="t('E-Mail-Benachrichtigungen')"
        >
          <UCheckbox variant="card" v-model="state.send_notifications">
            <template #label>
              {{
                t(
                  "Erhalte E-Mail-Benachrichtigungen über bevorstehende Schichten.",
                )
              }}
            </template>
          </UCheckbox>
        </FormsFormGroup>

        <div class="pt-2">
          <UButton type="submit">
            {{ t("Änderungen speichern") }}
          </UButton>
        </div>
      </UForm>
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  "Some fields are not filled in correctly": "Einige Felder sind nicht korrekt ausgefüllt."
  "i_pronouns": "Die Angabe der Pronomen ist freiwillig. Sie soll uns helfen bei Mila einen respektvollen Umgang miteinander zu pflegen, indem wir so mit- und übereinander sprechen, wie die angesprochenen Personen es wünschen."
en:
  "Einstellungen": "Settings"
  "Änderungen speichern": "Save changes"
  "Es ist ein Fehler aufgetreten.": "An error occurred."
  "Dein Profil wurde erfolgreich aktualisiert.": "Your profile has been updated successfully."

  "Wie sollen wir dich ansprechen?": "How should we address you?"
  "Dieser Name kann sich von deinem amtlichen Namen unterscheiden.": "This name can differ from your legal name."
  "Mit welchen Pronomen möchtest du angesprochen werden?": "Which pronouns would you like to be addressed with?"
  "Anonym bleiben": "Stay anonymous"
  "Verberge meinen Namen vor anderen Mitgliedern auf der Plattform.": "Do not show my name to other members on the platform."
  "E-Mail-Benachrichtigungen": "Email notifications"
  "Erhalte E-Mail-Benachrichtigungen über bevorstehende Schichten.": "Receive email notifications about upcoming shifts."

  "i_pronouns": "A declaration of pronouns is optional. They help us at MILA in creating an inclusive environment, by speaking to and about each other in a way, that respects everyones wishes."
</i18n>
