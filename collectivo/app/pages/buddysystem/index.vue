<script setup lang="ts">
import { z } from "zod";
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

const schema = z.object({
  buddy_status: z.enum(["need_buddy", "is_buddy", "keine_angabe"]),
  buddy_details: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

const state = reactive({
  buddy_status: user.buddy_status,
  buddy_details: user.buddy_details,
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const res = await useFetch("/api/profile", {
    method: "PUT",
    body: event.data,
  });
  if (res.status.value === "success") {
    await userData.value.reload();
    toast.add({
      title: t("Erfolgreich aktualisiert."),
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
</script>

<template>
  <BetaMessage />

  <h2 class="mb-0 pb-0">{{ t("Was bedeutet Buddy-System?") }}</h2>
  <div class="flex flex-col gap-3">
    <p>
      {{ t("Buddys sind MILA-Mitglieder, die gemeinsam eine Schicht machen.") }}
    </p>
    <p>
      {{
        t(
          "So können sie aktiv und wie alle anderen bei einer Fest-Schicht mitarbeiten.",
        )
      }}
    </p>
    <p>{{ t("Der Grund für Unterstützungs-Bedarf ist unterschiedlich.") }}</p>
    <p>
      {{
        t("Unterstützungs-Bedarf entsteht manchmal auch durch mehrere Dinge.")
      }}
    </p>
    <p>
      {{
        t("Zum Beispiel können Barrieren bei MILA das Mitmachen erschweren.")
      }}
    </p>
    <p>{{ t("Vielleicht fühlst du dich mit einem Buddy sicherer.") }}</p>
    <p>{{ t("Vielleicht hast du mit einem Buddy weniger Stress.") }}</p>
    <p>{{ t("Wir verstehen Unterstützung als gemeinsamen Prozess.") }}</p>
    <p>
      {{
        t(
          "Dabei wollen wir die einzelnen Lebensumstände und Bedürfnisse achten.",
        )
      }}
    </p>
    <p>
      {{
        t(
          "Durch die Buddy-Schichten kann jede*r selbstbestimmt und auf Augenhöhe teilhaben.",
        )
      }}
    </p>
    <div>
      <NuxtLink to="/shifts/calendar?filter=withbuddy">
        <UButton icon="i-heroicons-calendar-days-16-solid">
          {{ t("Offene Schichten mit Buddies anzeigen") }}
        </UButton>
      </NuxtLink>
    </div>
  </div>

  <SectionDivider />

  <h2>Mein Status</h2>
  <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
    <FormsFormGroup name="buddy_status">
      <URadioGroup
        variant="card"
        v-model="state.buddy_status"
        :items="[
          {
            label: 't_need_buddy',
            value: 'need_buddy',
          },
          {
            label: 't_is_buddy',
            value: 'is_buddy',
          },
          {
            label: 'Keine Angabe.',
            value: 'keine_angabe',
          },
        ]"
      >
        <template #label="{ item }">
          {{ t(item.label) }}
        </template>
      </URadioGroup>
    </FormsFormGroup>

    <FormsFormGroup
      name="buddy_details"
      v-if="state.buddy_status === 'need_buddy'"
    >
      <template #description> {{ t("t_need_buddy_details") }}:</template>
      <UTextarea v-model="state.buddy_details"> </UTextarea>
    </FormsFormGroup>
    <div>
      <UButton type="submit"> {{ t("Aktualisieren") }} </UButton>
    </div>
  </UForm>
</template>

<i18n lang="yaml">
de:
  "t_is_buddy": "Ich kann mir vorstellen eine andere Person in meiner Fest-Schicht zu unterstützen."
  "t_need_buddy": "Ich brauche Unterstützung. Ich wünsche mir eine Person, die mir während der Fest-Schicht zur Seite steht. Eine Fest-Schicht wiederholt sich alle 4 Wochen."
  "t_need_buddy_details": "Ich könnte Unterstützung brauchen bei folgender/n Tätigkeit/en (z.B. Unterstützung beim Lesen, Unterstützung in der Kommunikation, schwerer heben)"
en:
  "Mein Status": "My status"
  "Was bedeutet Buddy-System?": "What does buddy-system mean?"
  "Buddys sind MILA-Mitglieder, die gemeinsam eine Schicht machen.": "Buddies are MILA members who do a shift together."
  "So können sie aktiv und wie alle anderen bei einer Fest-Schicht mitarbeiten.": "This way they can actively participate in a regular shift like everyone else."
  "Der Grund für Unterstützungs-Bedarf ist unterschiedlich.": "The reason for the need for support is different."
  "Unterstützungs-Bedarf entsteht manchmal auch durch mehrere Dinge.": "The need for support sometimes arises from several things."
  "Zum Beispiel können Barrieren bei MILA das Mitmachen erschweren.": "For example, barriers at MILA can make participation difficult."
  "Vielleicht fühlst du dich mit einem Buddy sicherer.": "Maybe you feel safer with a buddy."
  "Vielleicht hast du mit einem Buddy weniger Stress.": "Maybe you have less stress with a buddy."
  "Wir verstehen Unterstützung als gemeinsamen Prozess.": "We understand support as a joint process."
  "Dabei wollen wir die einzelnen Lebensumstände und Bedürfnisse achten.": "In doing so, we want to respect individual life circumstances and needs."
  "Durch die Buddy-Schichten kann jede*r selbstbestimmt und auf Augenhöhe teilhaben.": "Through the buddy shifts, everyone can participate independently and on an equal footing."
  "Aktualisieren": "Update"
  "Keine Angabe.": "No indication."
  "t_is_buddy": "I can imagine supporting another person in my regular shift."
  "t_need_buddy": "I need support. I would like to have a person who stands by me during the regular shift. A regular shift repeats every 4 weeks."
  "t_need_buddy_details": "I might need support with the following activity/activities (e.g. support with reading, support with communication, heavy lifting)"
</i18n>
