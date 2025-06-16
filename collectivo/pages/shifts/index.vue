<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t, locale } = useI18n();
const { settingsState, fetchSettings } = useSettings();
setPageTitle(t("Shifts Overview"));

const mship = useCurrentUser().value.membership!;
const isActive = mship.shifts_user_type != "inactive";
const canShop = ref(false);
const dataLoaded = ref(false);
const absencePostModalOpen = ref(false);

const assignments: Ref<ShiftsOccurrenceDashboard[]> = ref([]);
const holidaysAll: Ref<ShiftsAbsenceDashboard[]> = ref([]);
const holidaysCurrent: Ref<ShiftsAbsenceDashboard[]> = ref([]);
const absences: Ref<ShiftsAbsenceDashboard[]> = ref([]);
const logs = ref<ShiftsLog[]>([]);

async function loadData() {
  dataLoaded.value = false;
  const [res, _] = await Promise.all([getOccurrencesUser(), fetchSettings()]);
  assignments.value = res.assignments as ShiftsOccurrenceDashboard[];
  holidaysAll.value = res.holidays as ShiftsAbsenceDashboard[];
  holidaysCurrent.value = res.holidaysCurrent as ShiftsAbsenceDashboard[];
  absences.value = res.signouts as ShiftsAbsenceDashboard[];
  logs.value = res.logs as ShiftsLog[];
  canShop.value =
    (mship.shifts_counter > -1 && holidaysCurrent.value.length == 0) ||
    mship.shifts_user_type == "exempt";
  dataLoaded.value = true;
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
            mship.shifts_user_type != 'exempt' &&
            mship.shifts_counter >= 0
          "
        >
          {{ t("Points") }}: {{ mship.shifts_counter }}
          {{ t("Next shift required in") }}:
          <span v-if="mship.shifts_counter >= 1">
            {{ mship.shifts_counter }} {{ t("days") }}
          </span>
          <span v-else-if="mship.shifts_counter == 1"> 1 {{ t("day") }} </span>
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

    <!-- SHIFT ASSIGNMENTS OCCURRENCES -->
    <div class="mb-12">
      <h2>{{ t("My assignments") }}</h2>
      <p v-if="!assignments.length">
        {{ t("No upcoming shifts") }}
      </p>
      <div class="flex flex-col gap-4 my-4">
        <template v-for="(assignment, index) in assignments" :key="index">
          <template v-if="assignment.nextOccurrence">
            <ShiftsDashboardAssignmentTile
              v-if="assignment.nextOccurrence"
              :shift-assignment="assignment"
              @reload="loadData"
            />
          </template>
        </template>
      </div>
    </div>

    <!-- ABSENCES -->
    <div v-if="absences.length" class="mb-12">
      <h2>{{ t("My signouts") }}</h2>
      <div class="flex flex-col gap-4 my-4">
        <CollectivoCard
          v-for="absence in absences"
          :key="absence.id"
          :color="'gray'"
        >
          <p>
            {{
              getDateSpanString(
                absence.shifts_from,
                absence.shifts_to,
                locale,
                t,
              )
            }}
          </p>
          <p v-if="absence.shifts_assignment">
            {{ t("Shift") }}ID:
            {{ absence.shifts_assignment.shifts_shift.shifts_name }}
          </p>
        </CollectivoCard>
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
            <p>
              {{
                getDateSpanString(
                  absence.shifts_from,
                  absence.shifts_to,
                  locale,
                  t,
                )
              }}
            </p>
          </CollectivoCard>
        </div>
      </div>
    </div>

    <!-- LOGS -->
    <div v-if="logs.length" class="mb-12">
      <h2>{{ t("Past shifts") }}</h2>
      <div class="my-4">
        <CollectivoCard :color="'gray'">
          <div class="flex flex-col gap-1">
            <div v-for="log in logs" :key="log.id">
              {{ log.shifts_date }}: {{ t("log:" + log.shifts_type) }}.
              {{ log.shifts_note }}
            </div>
          </div></CollectivoCard
        >
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
  "Shift": "Schicht"
  "Shift calendar": "Schichtkalender"
  "My shifts": "Meine Schichten"
  "My holidays": "Meine Urlaube"
  "My recent activities": "Meine letzten Aktivitäten"
  "Past shifts": "Vergangene Schichten"
  "My assignments": "Meine Anmeldungen"
  "My signouts": "Meine Abmeldungen"
  "Next shift required in": "Nächste Schicht erforderlich in"
  "days": "Tagen"
  "Timespan": "Zeitraum"
  "to": "bis"
  "My status": "Mein Status"
  "Shifts Overview": "Schichten Übersicht"
  "Register shift": "Schicht anmelden"
  "Submit holiday": "Urlaub einreichen"
</i18n>
