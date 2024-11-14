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
const holidaysAll: Ref<ShiftsAbsenceGet[]> = ref([]);
const holidaysCurrent: Ref<ShiftsAbsenceGet[]> = ref([]);
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

async function fetchAssignments() {
  return await $fetch("/api/shifts/assignments");
}

async function loadData() {
  dataLoaded.value = false;
  const res = await fetchAssignments();
  activeAssignments.value = res.assignmentRules;
  holidaysAll.value = res.holidays;
  holidaysCurrent.value = res.holidaysCurrent;
  activeAbsences.value = res.absences;
  canShop.value =
    (mship.shifts_counter > -1 && holidaysCurrent.value.length == 0) ||
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
    <!-- <h1>{{ t("My status") }}</h1> -->
    <CollectivoCard :color="canShop ? 'green' : 'red'" class="mb-8">
      <div>
        <h3>
          <span v-if="holidaysCurrent.length > 0">
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
        </h3>
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
    </CollectivoCard>

    <!-- Action Buttons -->
    <div v-if="isActive" class="flex flex-wrap mb-16 gap-4">
      <NuxtLink to="/shifts/signup-jumper"
        ><UButton icon="i-heroicons-plus-circle">{{
          t("Sign up for a shift")
        }}</UButton>
      </NuxtLink>

      <UButton
        icon="i-heroicons-pause-circle"
        @click="absencePostModalOpen = true"
        >{{ t("Request vacation") }}</UButton
      >
      <NuxtLink to="/help">
        <UButton
          :label="t('Other request')"
          :icon="'i-heroicons-pencil-square'"
        />
      </NuxtLink>
    </div>

    <!-- SHIFT OCCURRENCES -->
    <div class="mb-12">
      <h1>{{ t("My shifts") }}</h1>
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
    </div>

    <!-- HOLIDAYS -->
    <div class="mb-12">
      <h1>{{ t("My holidays") }}</h1>
      <div v-if="!holidaysAll.length">
        {{ t("No upcoming holidays") }}
      </div>
      <div v-else>
        <p>{{ t("t:holiday") }}</p>
        <div class="flex flex-col gap-4 my-4">
          <CollectivoCard
            v-for="absence in holidaysAll"
            :key="absence.id"
            :title="absence.shifts_is_holiday ? t('Holiday') : t('Absence')"
            :color="'blue'"
          >
            <div>{{ absence.shifts_from }} - {{ absence.shifts_to }}</div>
            <div>{{ t("Status") }}: {{ t(absence.shifts_status) }}</div>
            <div v-if="!absence.shifts_is_for_all_assignments">
              {{ t("Info") }}:
              {{ t("This absence affects only the shift") }}
              {{ getShiftName(absence.shifts_assignment) }}
            </div>
          </CollectivoCard>
        </div>
      </div>
    </div>

    <!-- LOGS -->

    <div v-if="logs.length" class="mb-12">
      <h2>{{ t("My activities") }}</h2>
      <div class="my-4">
        <CollectivoCard :color="'blue'">
          <div class="flex flex-col gap-1">
            <div v-for="log in logs" :key="log.id">
              {{ log.shifts_date }}: {{ t("log:" + log.shifts_type) }} ({{
                displayShiftScore(log.shifts_score)
              }}) {{ log.shifts_note }}
            </div>
          </div>
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
  "My status": "Mein Status"
  "My shifts": "Meine Schichten"
  "My holidays": "Meine Urlaube"
  "My activities": "Meine Aktivitäten"
</i18n>
