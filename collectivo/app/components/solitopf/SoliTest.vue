<script setup lang="ts">
const props = defineProps<{
  public?: boolean;
}>();
const { t } = useI18n();
const state = reactive({
  q1: null as boolean | null,
  q2: null as boolean | null,
  q3: null as boolean | null,
  q4: null as boolean | null,
  q5: null as boolean | null,
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <p>{{ t("t_test_intro") }}</p>
    </div>

    <div class="p-4 border border-black">
      <p class="font-bold mb-3">{{ t("q_test_1") }}</p>

      <div class="flex gap-3">
        <UButton
          :color="state.q1 === true ? 'purple' : 'gray'"
          @click="state.q1 = true"
        >
          {{ t("Ja") }}
        </UButton>
        <UButton
          :color="state.q1 === false ? 'purple' : 'gray'"
          @click="state.q1 = false"
        >
          {{ t("Weiß nicht") }}
        </UButton>
      </div>
    </div>

    <div v-if="state.q1 === false" class="p-4 border border-black">
      <p class="font-bold mb-2">{{ t("q_test_2") }}</p>

      <p class="mb-3 italic" style="white-space: pre-line">
        {{ t("q_test_2d") }}
      </p>

      <div class="flex gap-3">
        <UButton
          :color="state.q2 === false ? 'purple' : 'gray'"
          @click="state.q2 = false"
        >
          {{ t("Ja") }}
        </UButton>
        <UButton
          :color="state.q2 === true ? 'purple' : 'gray'"
          @click="state.q2 = true"
        >
          {{ t("Nein") }}
        </UButton>
      </div>
    </div>

    <div
      v-if="state.q1 === false && state.q2 === false"
      class="p-4 border border-black"
    >
      <p class="font-bold mb-3">{{ t("q_test_3") }}</p>

      <div class="flex gap-3">
        <UButton
          :color="state.q3 === true ? 'purple' : 'gray'"
          @click="state.q3 = true"
        >
          {{ t("Ja") }}
        </UButton>
        <UButton
          :color="state.q3 === false ? 'purple' : 'gray'"
          @click="state.q3 = false"
        >
          {{ t("Nein") }}
        </UButton>
      </div>
    </div>

    <div
      v-if="state.q1 === false && state.q2 === false && state.q3 === false"
      class="p-4 border border-black"
    >
      <p class="font-bold mb-3">{{ t("q_test_4") }}</p>

      <div class="flex gap-3">
        <UButton
          :color="state.q4 === true ? 'purple' : 'gray'"
          @click="state.q4 = true"
        >
          {{ t("Ja") }}
        </UButton>
        <UButton
          :color="state.q4 === false ? 'purple' : 'gray'"
          @click="state.q4 = false"
        >
          {{ t("Nein") }}
        </UButton>
      </div>
    </div>

    <div
      v-if="
        state.q1 === false &&
        state.q2 === false &&
        state.q3 === false &&
        state.q4 === false
      "
      class="p-4 border border-black"
    >
      <p class="font-bold mb-3">{{ t("q_test_5") }}</p>

      <div class="flex gap-2">
        <UButton
          :color="state.q5 === true ? 'purple' : 'gray'"
          @click="state.q5 = true"
        >
          {{ t("Ja") }}
        </UButton>
        <UButton
          :color="state.q5 === false ? 'purple' : 'gray'"
          @click="state.q5 = false"
        >
          {{ t("Nein") }}
        </UButton>
      </div>
    </div>

    <div
      v-if="
        state.q1 === false &&
        state.q2 === false &&
        state.q3 === false &&
        state.q4 === false &&
        state.q5 === false
      "
      class="p-4 border-4 border-milaGreen"
    >
      <p class="font-bold mb-3">{{ t("q_test_yes") }}</p>

      <div class="flex flex-wrap gap-3">
        <UButton
          to="/solitopf"
          color="gray"
          v-if="!public"
          icon="i-heroicons-arrow-left"
        >
          {{ t("Zurück") }}
        </UButton>

        <SolitopfFormButton />
      </div>
    </div>

    <div
      v-if="
        state.q1 === true ||
        state.q2 === true ||
        state.q3 === true ||
        state.q4 === true ||
        state.q5 === true
      "
      class="p-4 border border-black"
    >
      <p class="font-bold mb-2">{{ t("q_test_no") }}</p>

      <p class="italic">{{ t("q_test_no_d") }}</p>

      <UButton
        v-if="!public"
        class="mt-3"
        to="/solitopf"
        color="purple"
        icon="i-heroicons-arrow-left"
      >
        {{ t("Zurück zu den Soli-Topf Infos") }}
      </UButton>
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  t_test_intro: |
    Mit diesen Fragen kannst du überlegen, ob der Soli-Topf etwas für dich ist. 
    Niemand sieht deine Antworten – sie helfen nur dir zur Orientierung.
  q_test_1: |
    Hast du genug Geld, um bei MILA regelmäßig gut einzukaufen?

  q_test_2: |
    Hast du im Monat weniger als 1.661  € zum Leben (für Miete, Essen, Freizeit …)?

  q_test_2d: |
    (Je nach Haushaltsgröße erhöht sich die Grenze:  
     + 50 % für jede weitere Person ab 14 Jahren → ~ + 830 €  
     + 30 % für jedes Kind unter 14 Jahren → ~ + 498 € pro Kind unter 14 Jahren)

  q_test_3: |
    Kannst du dir ohne große finanzielle Sorgen das ganze Monat gutes und gesundes Essen leisten?

  q_test_4: |
    Kannst du ohne große finanzielle Sorgen einem*r Freund*in Geld borgen?

  q_test_5: |
    Könntest du dir ohne große finanzielle Sorgen eine neue Waschmaschine kaufen oder die Reparatur bezahlen, wenn deine heute kaputt geht?

  q_test_yes: |
    Dann kannst du Geld aus dem Soli-Topf bekommen!

  q_test_no: |
    Dann brauchst du wahrscheinlich gerade keine Unterstützung.

  q_test_no_d: |
    Wenn sich etwas ändert, kannst du dich jederzeit melden.
en:
  Ja: Yes
  Nein: No
  Weiß nicht: Don't know
  Zurück: Go back
  Zurück zu den Soli-Topf Infos: Back to the Solidarity Fund Info
  t_test_intro: |
    These questions can help you decide if the solidarity fund is right for you. 
    No one will see your answers – they are just for your own orientation.
  q_test_1: |
    Do you have enough money to shop well at MILA regularly?

  q_test_2: |
    Do you have less than €1,661 per month to live on (for rent, food, leisure, etc.)?

  q_test_2d: |
    (Depending on the size of your household, the limit increases:  
     + 50% for each additional person over 14 years old → ~ + €830  
     + 30% for each child under 14 years old → ~ + €498 per child under 14 years old)

  q_test_3: |
    Can you afford good and healthy food for the whole month without major financial worries?

  q_test_4: |
    Can you lend money to a friend without major financial worries?

  q_test_5: |
    Could you afford to buy a new washing machine or pay for repairs if yours broke down, without major financial worries?

  q_test_yes: |
    Then you can get money from the solidarity fund!

  q_test_no: |
    Then you probably don't need support.

  q_test_no_d: |
    If something changes, you can always get in touch.
</i18n>
