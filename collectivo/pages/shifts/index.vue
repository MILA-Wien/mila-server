<script setup lang="ts">
import { readItems } from "@directus/sdk";

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
const activeHolidays: Ref<ShiftsAbsenceGet[]> = ref([]);
const activeAbsences: Ref<ShiftsAbsenceGet[]> = ref([]);
const directus = useDirectus();

const canShop = ref(false);
const dataLoaded = ref(false);
const absencePostModalOpen = ref(false);
const logs = ref<ShiftsLog[]>([]);

async function getLogs() {
  logs.value = await directus.request(
    readItems("shifts_logs", {
      filter: { shifts_membership: mship.id },
      sort: ["-shifts_date"],
    }),
  );
}

getLogs();

async function loadData() {
  dataLoaded.value = false;
  const res = await getUserAssignments(mship);
  activeAssignments.value = res.assignmentRules;
  activeHolidays.value = res.holidays;
  activeAbsences.value = res.absences;
  canShop.value =
    (mship.shifts_counter > -1 && activeHolidays.value.length == 0) ||
    mship.shifts_user_type == "exempt";

  dataLoaded.value = true;
}

function getShiftName(assignmentID: number) {
  const assignment = activeAssignments.value.find(
    (a) => a.assignment.id == assignmentID,
  );
  return assignment?.assignment.shifts_shift.shifts_name;
}

function displayShiftScore(score: number) {
  return score > 0 ? "+" + score : score;
}

if (isActive) loadData();
</script>

<template>
  <div v-if="!isActive">
    <p>
      {{ t("Shift system has not been activated for this account.") }}
    </p>
  </div>
  <div v-else-if="dataLoaded">
    <CollectivoCard :color="canShop ? 'green' : 'red'" :title="t('Status')">
      <template #content>
        <div>
          <p class="font-bold">
            <span v-if="activeHolidays.length > 0">
              {{ t("Holiday") }}: {{ t("Shopping is not allowed") }}
            </span>
            <span
              v-else-if="
                mship.shifts_counter > -1 || mship.shifts_user_type == 'exempt'
              "
            >
              {{ t("Shopping is allowed") }}
            </span>
            <span v-else>
              {{ t("Missing shifts") }}: {{ t("Shopping is not allowed") }}
            </span>
          </p>
          <p class="pt-3">
            {{ t("Membership") }}: {{ mship.id }} ({{
              user.first_name + " " + user.last_name
            }})
          </p>
          <p>{{ t("Shifttype") }}: {{ t("t:" + mship.shifts_user_type) }}</p>

          <p v-if="mship.shifts_user_type != 'exempt'">
            {{ t("Shiftcounter") }}: {{ mship.shifts_counter }}
          </p>
        </div>
      </template>
    </CollectivoCard>

    <div v-if="isActive" class="flex flex-wrap py-6 gap-5">
      <NuxtLink to="/shifts/signup-jumper"
        ><UButton size="lg" icon="i-heroicons-plus-circle">{{
          t("Sign up for a shift")
        }}</UButton>
      </NuxtLink>

      <UButton
        size="lg"
        icon="i-heroicons-pause-circle"
        @click="absencePostModalOpen = true"
        >{{ t("Request vacation") }}</UButton
      >
      <a :href="`mailto:${config.public.contactEmail}`">
        <UButton
          size="lg"
          :label="t('Other request') + ': ' + config.public.contactEmail"
          :icon="'i-heroicons-pencil-square'"
        />
      </a>
    </div>

    <!-- SHIFT OCCURRENCES -->

    <h2>{{ t("My shifts") }}</h2>
    <p v-if="!activeAssignments.length">
      {{ t("No upcoming shifts") }}
    </p>
    <div class="flex flex-col gap-4 my-4">
      <ShiftsAssignmentCard
        v-for="assignment in activeAssignments"
        :key="assignment.assignment.id"
        :shift-assignment="assignment"
        @reload="loadData"
      />
    </div>

    <!-- HOLIDAYS -->

    <div v-if="activeHolidays.length">
      <h2>{{ t("Holidays") }}</h2>
      <p>{{ t("t:holiday") }}</p>
      <div class="flex flex-col gap-4 my-4">
        <CollectivoCard
          v-for="absence in activeHolidays"
          :key="absence.id"
          :title="absence.shifts_is_holiday ? t('Holiday') : t('Absence')"
          :color="'blue'"
        >
          <template #content>
            <div>{{ absence.shifts_from }} - {{ absence.shifts_to }}</div>
            <div>{{ t("Status") }}: {{ t(absence.shifts_status) }}</div>
            <div v-if="!absence.shifts_is_for_all_assignments">
              {{ t("Info") }}:
              {{ t("This absence affects only the shift") }}
              {{ getShiftName(absence.shifts_assignment) }}
            </div>
          </template>
        </CollectivoCard>
      </div>
    </div>

    <!-- LOGS -->

    <div v-if="logs.length">
      <h2>{{ t("My activities") }}</h2>
      <div class="my-4">
        <CollectivoCard :color="'blue'">
          <template #content>
            <div class="flex flex-col gap-1">
              <div v-for="log in logs" :key="log.id">
                {{ log.shifts_date }}: {{ t("log:" + log.shifts_type) }} ({{
                  displayShiftScore(log.shifts_score)
                }}) {{ log.shifts_note }}
              </div>
            </div>
          </template>
        </CollectivoCard>
      </div>
    </div>

    <!-- MODALS -->
    <ShiftsHolidayModal
      v-model="absencePostModalOpen"
      :mship-i-d="mship.id"
      @reload="loadData"
    />
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
  "My next shifts": "Meine nächsten Schichten"
  "My absences": "Meine Abwesenheiten"
  "My activities": "Meine Aktivitäten"
  "Upcoming shifts": "Kommende Schichten"
  "No upcoming shifts": "Keine kommenden Schichten"
  "shifts": "Schichten"
  "shift": "Schicht"
  "ahead": "voraus"
  "to catch up": "nachzuholen"
  "Skills": "Fähigkeiten"

  "None": "Keine"
  requested: "Beantragt"
  accepted: "Angenommen"
  denied: "Abgelehnt"
  Other request: "Andere Anfrage"
  Request vacation: "Urlaub beantragen"
  From: "Von"
  To: "Bis"
  Absence: "Abwesenheit"
  Holiday: "Urlaub"
  Holidays: "Urlaube"
  Missing shifts: "Fehlende Schichten"
  Shopping is allowed: "Einkaufen ist erlaubt"
  Shopping is not allowed: "Einkaufen ist nicht erlaubt"
  "Please fill out every field.": "Bitte fülle jedes Feld aus."
  "Absence must start in the future.": "Abwesenheit muss in der Zukunft beginnen."
  "Absence must end after it starts.": "Abwesenheit muss nach dem Start enden."
  "Please select a valid date range.": "Bitte wähle einen validen Datumsbereich aus."
  Absence has been requested: "Abwesenheit wurde beantragt"
  Success: "Erfolg"
  During a holiday, shopping is not allowed and no shift points are deducted.: "Während eines Urlaubs ist das Einkaufen nicht erlaubt und es werden keine Schichtpunkte abgezogen."
  "During an absence, all shift assignments are paused.": "Während einer Abwesenheit werden alle Schichtanmeldung pausiert."
  This absence affects only the shift: "Diese Abwesenheit betrifft nur die Schicht"
  "t:regular": "Festschicht"
  "t:jumper": "Springer*in"
  "t:exempt": "Befreit"
  "t:inactive": "Nicht aktiv"

  "log:attended": "Schicht absolviert"
  "log:missed": "Schicht verpasst"
  "log:cancelled": "Schicht abgesagt"
  "log:other": "Anderes"

en:
  "t:regular": "Regular"
  "t:jumper": "Jumper"
  "t:exempt": "Exempt"
  "t:inactive": "Inactive"

  "log:attended": "Shift done"
  "log:missed": "Shift missed"
  "log:cancelled": "Shift cancelled"
  "log:other": "Other"
</i18n>
