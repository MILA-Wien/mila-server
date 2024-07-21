<script setup lang="ts">
import { createItem } from "@directus/sdk";

definePageMeta({
  middleware: ["auth"],
});

const config = useRuntimeConfig();

const { t } = useI18n();
setCollectivoTitle(t("Shifts"));

const user = useCollectivoUser().value.user!;
const mship = useCollectivoUser().value.membership!;
const isActive = mship.shifts_user_type != "inactive";
const activeAssignments: Ref<ShiftsAssignmentRules[]> = ref([]);
const directus = useDirectus();

const absencePostModalOpen = ref(false);
const absenceFromDate = ref<Date | undefined>(undefined);
const absenceToDate = ref<Date | undefined>(undefined);
const absenceIsHoliday = ref(false);

async function postAbsence() {
  if (
    !absenceFromDate.value ||
    !absenceToDate.value ||
    absenceFromDate.value > absenceToDate.value ||
    absenceToDate.value < new Date() ||
    absenceFromDate.value < new Date()
  ) {
    showToast({
      type: "error",
      title: "Error",
      description: t("Please select a valid date range."),
    });
    return;
  }

  const payload = {
    shifts_membership: mship.id,
    shifts_from: absenceFromDate.value?.toISOString(),
    shifts_to: absenceToDate.value?.toISOString(),
    shifts_is_holiday: absenceIsHoliday.value,
  };

  console.log(payload);
  await directus.request(createItem("shifts_absences", payload));
  absencePostModalOpen.value = false;
  absenceFromDate.value = undefined;
  absenceToDate.value = undefined;
  absenceIsHoliday.value = false;

  showToast({
    type: "success",
    // title: ",
    // description: t("Please select a valid date range."),
  });
}

async function loadData() {
  activeAssignments.value = await getActiveAssignments(user, mship);
}

if (isActive) loadData();
</script>

<template>
  <div v-if="!isActive">
    <p>
      {{ t("Shift system has not been activated for this account.") }}
    </p>
  </div>
  <div v-else>
    <CollectivoContainer>
      <div>
        <p>{{ t("Membership number") }}: {{ mship.id }}</p>
        <p>{{ t("Name") }}: {{ user.first_name + " " + user.last_name }}</p>
        <p>{{ t("Shifttype") }}: {{ t("t:" + mship.shifts_user_type) }}</p>

        <!-- <p>
          <span>{{ t("Skills") }}: </span>
          <span v-if="!mship.shifts_skills.length">{{ t("None") }}</span>
          <span v-for="(skill, index) in mship.shifts_skills" :key="skill.id">
            <span v-if="index !== 0">, </span>
            <span>{{ skill.shifts_skills_id.shifts_name }}</span>
          </span>
        </p> -->

        <p v-if="mship.shifts_user_type != 'exempt'">
          {{ t("Shiftcounter") }}: {{ mship.shifts_counter }}
        </p>
      </div>
    </CollectivoContainer>

    <div v-if="isActive" class="flex flex-wrap pb-6 gap-5">
      <NuxtLink to="/shifts/signup-jumper"
        ><UButton size="lg" icon="i-heroicons-plus-circle">{{
          t("Sign up for a one-time shift")
        }}</UButton>
      </NuxtLink>

      <UButton
        size="lg"
        icon="i-heroicons-pause-circle"
        @click="absencePostModalOpen = true"
        >{{ t("Ask for absence") }}</UButton
      >

      <!-- <NuxtLink to="/shifts/signup"
        ><UButton size="lg" icon="i-heroicons-plus-circle">{{
          t("Sign up for a shift")
        }}</UButton></NuxtLink
      > -->
      <a :href="`mailto:${config.public.collectivoContactEmail}`">
        <UButton
          size="lg"
          :label="t('Other request')"
          :icon="'i-heroicons-pencil-square'"
        />
      </a>
    </div>

    <h2>{{ t("My shifts") }}</h2>
    <p v-if="!activeAssignments.length">
      {{ t("No upcoming shifts") }}
    </p>
    <div class="flex flex-col gap-4 my-4">
      <ShiftsAssignmentCard
        v-for="assignment in activeAssignments"
        :key="assignment.assignment.id"
        :shift-assignment="assignment"
      />
    </div>
    <UModal v-model="absencePostModalOpen">
      <div class="p-10">
        <h2>{{ t("Ask for absence") }}</h2>
        <UFormGroup :label="t('From')" class="my-5">
          <CollectivoFormDate
            v-model="absenceFromDate"
            :max-years-past="1"
            :max-years-future="1"
          />
        </UFormGroup>
        <UFormGroup :label="t('To')" class="my-5">
          <CollectivoFormDate
            v-model="absenceToDate"
            :max-years-past="1"
            :max-years-future="1"
          />
        </UFormGroup>

        <UFormGroup :label="t('Holiday') + '?'" class="my-5">
          <div class="form-box flex flex-row">
            <UToggle v-model="absenceIsHoliday" class="mt-0.5 mr-2" />
            <span>{{
              t(
                "I will not be able to go shopping during this absence and am not required to do shifts.",
              )
            }}</span>
          </div>
        </UFormGroup>
        <UButton
          class="w-full"
          size="lg"
          icon="i-heroicons-pencil-square"
          @click="postAbsence()"
        >
          {{ t("Ask for absence") }}
        </UButton>
      </div>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
de:
  "Membership number": "Mitgliedsnummer"
  "Shifttype": "Schichttyp"
  "Shiftcounter": "Schichtzähler"
  "Request change": "Änderung beantragen"
  "t:shift_status_good": "Gut!"
  "t:shift_status_bad": "Du musst Schichten nachholen"
  "t:shift_status_exempt": "Du bist von Schichten befreit"
  "Choose shift type": "Schichttyp wählen"
  "Shifts": "Schichten"
  "My shifts": "Meine Schichten"
  "Upcoming shifts": "Kommende Schichten"
  "No upcoming shifts": "Keine kommenden Schichten"
  "shifts": "Schichten"
  "shift": "Schicht"
  "ahead": "voraus"
  "to catch up": "nachzuholen"
  "Skills": "Fähigkeiten"
  "Sign up for a shift": "Neue Schicht eintragen"
  "t:regular": "Regulär"
  "t:jumper": "Springer*in"
  "t:exempt": "Befreit"
  "t:inactive": "Nicht aktiv"
  "None": "Keine"
  "My activities": "Meine Aktivitäten"
  "Sign up for a one-time shift": "Einmalige Schicht eintragen"
  Other request: "Andere Anfrage"
  Ask for absence: "Abwesenheit beantragen"
  From: "Von"
  To: "Bis"
  Holiday: "Urlaub"
  "Please select a valid date range.": "Bitte wähle einen validen Datumsbereich aus."

  I will not be able to go shopping during this absence and am not required to do shifts.: "Ich werde während dieser Abwesenheit nicht einkaufen können und bin nicht verpflichtet, Schichten zu übernehmen."
</i18n>
