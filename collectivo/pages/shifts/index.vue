<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t, locale } = useI18n();
setPageTitle(t("Shifts Overview"));

const mship = useCurrentUser().value.membership!;
const isActive = mship.shifts_user_type != "inactive";
const activeAssignments: Ref<ShiftsAssignmentInfos[]> = ref([]);
const holidaysAll: Ref<ShiftsAbsenceGet[]> = ref([]);
const holidaysCurrent: Ref<ShiftsAbsenceGet[]> = ref([]);
const activeAbsences: Ref<ShiftsAbsenceGet[]> = ref([]);
const { settingsState, fetchSettings } = useSettings();
const canShop = ref(false);
const dataLoaded = ref(false);
const absencePostModalOpen = ref(false);
const logs = ref<ShiftsLog[]>([]);

async function loadData() {
  dataLoaded.value = false;
  const res = await $fetch("/api/shifts/my_shifts");
  activeAssignments.value = res.assignmentRules as ShiftsAssignmentInfos[];
  holidaysAll.value = res.holidays as ShiftsAbsenceGet[];
  holidaysCurrent.value = res.holidaysCurrent as ShiftsAbsenceGet[];
  activeAbsences.value = res.absences as ShiftsAbsenceGet[];
  logs.value = res.logs as ShiftsLog[];
  canShop.value =
    (mship.shifts_counter > -1 && holidaysCurrent.value.length == 0) ||
    mship.shifts_user_type == "exempt";
  await fetchSettings();
  dataLoaded.value = true;
}

function getShiftName(assignmentID: number) {
  const assignment = activeAssignments.value.find(
    (a) => a.assignment.id == assignmentID,
  );
  return assignment?.assignment.shifts_shift.shifts_name;
}

if (isActive) loadData();
else throw createError({ statusCode: 403 });
</script>

<template>
  <div v-if="dataLoaded">
    <CollectivoCard :color="canShop ? 'green' : 'orange'" class="mb-4">
      <div>
        <h4>{{ t("My status") }}</h4>

        <div>
          <span v-if="holidaysCurrent.length > 0">
            {{ t("Holiday") }} - {{ t("Shopping is not allowed") }}
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
        </div>
        <p>{{ t("Shifttype") }}: {{ t("t:" + mship.shifts_user_type) }}</p>

        <p
          v-if="
            settingsState!.shift_point_system &&
            mship.shifts_user_type != 'exempt'
          "
        >
          {{ t("Next shift required in") }}: {{ mship.shifts_counter }}
          {{ t("days") }}
        </p>
      </div>
    </CollectivoCard>

    <!-- Action Buttons -->
    <div
      v-if="isActive"
      class="flex flex-wrap mb-14 gap-3 w-full justify-center whitespace-nowrap"
    >
      <NuxtLink to="/shifts/calendar" class="flex-1">
        <UButton block icon="i-heroicons-calendar-days-16-solid">{{
          t("Register shift")
        }}</UButton>
      </NuxtLink>

      <UButton
        class="flex-1"
        block
        icon="i-heroicons-pause-circle"
        @click="absencePostModalOpen = true"
        >{{ t("Submit holiday") }}</UButton
      >
      <NuxtLink to="/help" class="flex-1">
        <UButton
          block
          :label="t('Other request')"
          :icon="'i-heroicons-pencil-square'"
        />
      </NuxtLink>
    </div>

    <!-- SHIFT OCCURRENCES -->
    <div class="mb-12">
      <h2>{{ t("My assignments") }}</h2>
      <p v-if="!activeAssignments.length">
        {{ t("No upcoming shifts") }}
      </p>
      <div class="flex flex-col gap-4 my-4">
        <ShiftsDashboardAssignmentTile
          v-for="assignment in activeAssignments"
          :key="assignment.assignment.id"
          :shift-assignment="assignment"
          @reload="loadData"
        />
      </div>
    </div>

    <!-- HOLIDAYS -->
    <div v-if="holidaysAll.length" class="mb-12">
      <h2>{{ t("My holidays") }}</h2>
      <div>
        <div class="flex flex-col gap-4 my-4">
          <CollectivoCard
            v-for="absence in holidaysAll"
            :key="absence.id"
            :color="'blue'"
          >
            <h4>
              {{
                getDateSpanString(
                  absence.shifts_from,
                  absence.shifts_to,
                  locale,
                  t,
                )
              }}
            </h4>
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
      <h2>{{ t("Past shifts") }}</h2>
      <div class="my-4">
        <div class="flex flex-col gap-1">
          <div v-for="log in logs" :key="log.id">
            <CollectivoCard :color="'gray'">
              {{ log.shifts_date }}: {{ t("log:" + log.shifts_type) }}.
              {{ log.shifts_note }}
            </CollectivoCard>
          </div>
        </div>
      </div>
    </div>

    <!-- MODALS -->
    <ShiftsDashboardHolidayModal
      v-model="absencePostModalOpen"
      :mship-i-d="mship.id"
      @reload="loadData"
    />
  </div>
</template>

<i18n lang="yaml">
de:
  "Shift calendar": "Schichtkalender"
  "My shifts": "Meine Schichten"
  "My holidays": "Meine Urlaube"
  "My recent activities": "Meine letzten Aktivitäten"
  "Past shifts": "Vergangene Schichten"
  "My assignments": "Meine Anmeldungen"
  "Next shift required in": "Nächste Schicht erforderlich in"
  "days": "Tagen"
  "Timespan": "Zeitraum"
  "to": "bis"
  "My status": "Mein Status"
  "Shifts Overview": "Schichten Übersicht"
  "Register shift": "Schicht anmelden"
  "Submit holiday": "Urlaub einreichen"
</i18n>
