<script setup lang="ts">
import {
  ACTIVATION_SURVEY_CHOICES,
  ACTIVATION_SURVEY_MAX_TEXT_LENGTH,
  choiceRequiresText,
  isActivationSurveyChoice,
  type ActivationSurveyChoice,
} from "../../../shared/activationSurvey";

definePageMeta({
  middleware: ["auth"],
});

const { t, locale } = useI18n();
setPageTitle(t("Wie geht's weiter mit deiner Mitmach-Schicht?"), {
  backLink: "/profile",
  backLinkLabel: t("Zurück zum Profil"),
});

const toast = useToast();
const route = useRoute();
const userData = useCurrentUser();
const membership = userData.value.membership;

const HANDBOOK_EXEMPTION =
  "https://handbuch.mila.wien/books/mitglieder-handbuch/page/befreiung-von-schichten";
const HANDBOOK_ABSENCE =
  "https://handbuch.mila.wien/books/mitglieder-handbuch/page/urlaub-und-abwesenheit-eintragen";

const savedChoice = ref<string | null>(
  membership?.activation_survey_choice ?? null,
);
const savedAt = ref<string | null>(membership?.activation_survey_date ?? null);

const choice = ref<ActivationSurveyChoice | undefined>(
  isActivationSurveyChoice(savedChoice.value) ? savedChoice.value : undefined,
);
const text = ref<string>(membership?.activation_survey_response ?? "");
const saving = ref(false);

const items = computed(() =>
  ACTIVATION_SURVEY_CHOICES.map((value) => ({
    value,
    label: t(`choice_${value}`),
  })),
);

const needsText = computed(() =>
  choice.value ? choiceRequiresText(choice.value) : false,
);

const canSave = computed(() => {
  if (!choice.value || saving.value) return false;
  if (needsText.value && !text.value.trim()) return false;
  return true;
});

const savedAtLabel = computed(() =>
  savedAt.value
    ? new Date(savedAt.value).toLocaleDateString(locale.value, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null,
);

async function persist(
  value: ActivationSurveyChoice,
  body: string,
): Promise<boolean> {
  const res = await useFetch("/api/profile/activation_survey", {
    method: "POST",
    body: JSON.stringify({ choice: value, text: body }),
  });
  if (res.status.value !== "success") return false;
  await userData.value.reload();
  savedChoice.value = value;
  savedAt.value = new Date().toISOString();
  return true;
}

async function onSubmit() {
  if (!choice.value) return;
  saving.value = true;
  const ok = await persist(choice.value, needsText.value ? text.value : "");
  saving.value = false;
  toast.add(
    ok
      ? { title: t("Danke, deine Antwort ist bei uns angekommen.") }
      : {
          title: t("Es ist ein Fehler aufgetreten."),
          icon: "i-heroicons-exclamation-triangle",
        },
  );
}

// A link in the survey email carries the member's answer in ?choice=. Treat that click as
// a real answer and record it immediately - otherwise the two link-out options, where the
// member clicks straight through to the handbook, would leave no trace at all.
//
// Only when nothing is saved yet: a member returning via an old email link must not have
// the free text they wrote months ago silently overwritten. They just get it preselected.
onMounted(async () => {
  const fromLink = route.query.choice;
  if (!isActivationSurveyChoice(fromLink)) return;
  choice.value = fromLink;
  if (savedChoice.value) return;
  const ok = await persist(fromLink, "");
  if (!ok) {
    // Surface the failure: otherwise a member who clicked an email link and left would
    // believe their answer had been recorded when nothing was saved.
    toast.add({
      title: t("Es ist ein Fehler aufgetreten."),
      icon: "i-heroicons-exclamation-triangle",
    });
  }
});
</script>

<template>
  <div class="space-y-8">
    <p>{{ t("t_intro") }}</p>

    <p v-if="savedAtLabel" class="text-sm opacity-75">
      {{ t("Du hast am {date} geantwortet.", { date: savedAtLabel }) }}
    </p>

    <FormsFormGroup name="choice">
      <template #description>{{ t("Wähl eine Option") }}</template>
      <URadioGroup v-model="choice" variant="card" :items="items" />
    </FormsFormGroup>

    <!-- Wieder loslegen -->
    <div v-if="choice === 'restart'" class="space-y-3">
      <p>{{ t("t_restart") }}</p>
      <UButton to="/shifts" icon="i-heroicons-calendar-days">
        {{ t("Zum Schichtensystem") }}
      </UButton>
    </div>

    <!-- Gesundheitliche Gründe -->
    <div v-else-if="choice === 'health'" class="space-y-3">
      <p>{{ t("t_health") }}</p>
      <div class="flex flex-wrap gap-3">
        <UButton
          :href="HANDBOOK_EXEMPTION"
          target="_blank"
          color="green"
          icon="i-heroicons-arrow-top-right-on-square"
        >
          {{ t("Befreiung von Schichten") }}
        </UButton>
        <UButton
          :href="HANDBOOK_ABSENCE"
          target="_blank"
          color="green"
          variant="outline"
          icon="i-heroicons-arrow-top-right-on-square"
        >
          {{ t("Urlaub und Abwesenheit") }}
        </UButton>
      </div>
    </div>

    <!-- Freitext-Optionen -->
    <FormsFormGroup v-else-if="needsText" name="text">
      <template #title>{{ t(`prompt_${choice}`) }}</template>
      <UTextarea
        v-model="text"
        :rows="4"
        :maxlength="ACTIVATION_SURVEY_MAX_TEXT_LENGTH"
        class="w-full"
        :placeholder="t(`placeholder_${choice}`)"
      />
      <p class="mt-1 text-xs opacity-70">
        {{ text.length }}/{{ ACTIVATION_SURVEY_MAX_TEXT_LENGTH }}
      </p>
    </FormsFormGroup>

    <div>
      <UButton
        :disabled="!canSave"
        :loading="saving"
        icon="i-heroicons-check"
        @click="onSubmit"
      >
        {{ t("Speichern") }}
      </UButton>
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  t_intro: "Wähl die Zeile, die gerade am besten passt. Je nachdem geht's direkt weiter zu den Infos oder du schreibst uns kurz, was du brauchst — dauert unter einer Minute."
  Wähl eine Option: "Wähl eine Option"
  Du hast am {date} geantwortet.: "Du hast am {date} geantwortet."
  choice_restart: "Ich möchte jetzt wieder loslegen"
  choice_more-support: "Ich wünsche mir mehr Unterstützung bei der Mitmach-Schicht"
  choice_different-form: "Ich brauche eine andere Form von Mitmach-Schicht, um mich bei MILA einzubringen"
  choice_health: "Ich kann aus gesundheitlichen Gründen derzeit nicht mitmachen"
  choice_other: "Etwas anderes"
  t_restart: "Schön! Weiter geht's im Schichtensystem — dort siehst du freie Schichten und kannst dich gleich eintragen."
  t_health: "Alles klar, gute Besserung. Hier findest du, wie eine Befreiung oder Beurlaubung von der Mitmach-Schicht funktioniert."
  prompt_more-support: "Welche Unterstützung wünscht du dir für deine Schichten?"
  prompt_different-form: "Was würde für dich besser passen?"
  prompt_other: "Erzähl uns, worum es geht."
  placeholder_more-support: "Erzähl uns kurz, was dir helfen würde …"
  placeholder_different-form: "Beschreib kurz, welche Form von Mitmachen für dich passen würde …"
  placeholder_other: "Schreib uns kurz …"

en:
  Wie geht's weiter mit deiner Mitmach-Schicht?: "How do you want to continue with your participation shift?"
  Zurück zum Profil: "Back to the profile"
  t_intro: "Pick the line that fits best right now. Depending on your answer you will either go straight to the information or briefly tell us what you need — it takes less than a minute."
  Wähl eine Option: "Choose an option"
  Du hast am {date} geantwortet.: "You answered on {date}."
  choice_restart: "I would like to get going again"
  choice_more-support: "I would like more support with my participation shift"
  choice_different-form: "I need a different form of participation shift to contribute to MILA"
  choice_health: "For health reasons I currently cannot take part"
  choice_other: "Something else"
  t_restart: "Great! Continue in the shift system — there you can see open shifts and sign up straight away."
  t_health: "Understood, get well soon. Here you can find how an exemption or a leave of absence from the participation shift works."
  prompt_more-support: "What support would you like for your shifts?"
  prompt_different-form: "What would suit you better?"
  prompt_other: "Tell us what this is about."
  placeholder_more-support: "Briefly tell us what would help you …"
  placeholder_different-form: "Briefly describe what form of participation would suit you …"
  placeholder_other: "Write us a short note …"
  Zum Schichtensystem: "Go to the shift system"
  Befreiung von Schichten: "Exemption from shifts"
  Urlaub und Abwesenheit: "Holiday and absence"
  Speichern: "Save"
  Danke, deine Antwort ist bei uns angekommen.: "Thank you, we have received your answer."
  Es ist ein Fehler aufgetreten.: "An error occurred."
</i18n>
