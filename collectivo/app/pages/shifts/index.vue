<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t, locale } = useI18n();
const { settingsState, fetchSettings } = useSettings();
setPageTitle(t("Shifts Overview"));

const mship = useCurrentUser().value.membership!;
const isActive = mship.shifts_user_type != "inactive";
const dataLoaded = ref(false);
const absencePostModalOpen = ref(false);

const assignments: Ref<any> = ref([]);
const holidaysAll: Ref<any> = ref([]);
const holidaysCurrent: Ref<any> = ref([]);
const absences: Ref<any> = ref([]);
const logs = ref<any>([]);

async function loadData() {
  dataLoaded.value = false;
  const [res, _] = await Promise.all([getOccurrencesUser(), fetchSettings()]);
  assignments.value = res.assignments as any;
  holidaysAll.value = res.holidays as any;
  holidaysCurrent.value = res.holidaysCurrent as any;
  absences.value = res.signouts as any;
  logs.value = res.logs as any;

  dataLoaded.value = true;
}

loadData();
</script>

<template>
  <div v-if="!dataLoaded" class="">
    <USkeleton class="h-32 w-full rounded-none" />
  </div>
  <div v-else>
    <!-- Action Buttons -->
    <div
      v-if="isActive"
      class="flex flex-wrap mb-14 gap-3 w-full justify-center whitespace-nowrap"
    >
      <NuxtLink to="/shifts/calendar?filter=unfilled" class="flex-1">
        <UButton block icon="i-heroicons-calendar-days-16-solid">{{
          t("Register shift")
        }}</UButton>
      </NuxtLink>

      <UButton
        class="flex-1"
        block
        icon="i-heroicons-pause-circle"
        @click="absencePostModalOpen = true"
      >
        {{ t("Submit holiday") }}
      </UButton>
      <NuxtLink to="/help" class="flex-1">
        <UButton
          block
          :label="t('Other request')"
          :icon="'i-heroicons-pencil-square'"
        />
      </NuxtLink>
    </div>

    <div>
      <h2>{{ t("My status") }}</h2>
      <ShiftsDashboardStatusTile
        :mship="mship"
        :settings-state="settingsState"
        :holidays-current="holidaysCurrent"
      />
    </div>

    <SectionDivider />

    <!-- SHIFT ASSIGNMENTS OCCURRENCES -->
    <div class="mb-12">
      <h2>{{ t("My assignments") }}</h2>
      <p v-if="!assignments.length">
        {{ t("No upcoming shifts") }}
      </p>
      <div class="flex flex-col gap-4 my-4">
        <template v-for="(assignment, index) in assignments" :key="index">
          <template v-if="assignment.occurrences.length > 0">
            <ShiftsDashboardAssignmentTile
              :shift-assignment="assignment"
              @reload="loadData"
            />
          </template>
        </template>
      </div>
    </div>

    <!-- HOLIDAYS -->
    <div v-if="holidaysAll.length" class="mb-12">
      <h2>{{ t("My holidays") }}</h2>
      <div>
        <div class="flex flex-col gap-4 my-4">
          <div
            v-for="absence in holidaysAll"
            :key="absence.id"
            class="p-4 border"
          >
            <h4>{{ t("Holiday") }}</h4>
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
          </div>
        </div>
      </div>
    </div>

    <!-- LOGS -->
    <div v-if="logs.length" class="mb-12">
      <h2>{{ t("Logbook") }}</h2>
      <div class="my-4">
        <div class="p-4 border">
          <div class="flex flex-col gap-1">
            <div v-for="log in logs" :key="log.id">
              {{ getDateString(log.shifts_date, locale) }}:
              {{ t("log:" + log.shifts_type) }}.
              {{ log.shifts_note }}
            </div>
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
  "Shift": "Schicht"
  "Shift calendar": "Schichtkalender"
  "My status": "Mein Status"
  "You can go shopping": "Du kannst einkaufen gehen"
  "My shifts": "Meine Schichten"
  "My holidays": "Meine Urlaube"
  "My recent activities": "Meine letzten Aktivitäten"
  "Logbook": "Logbuch"
  "My assignments": "Meine Anmeldungen"
  "My signouts": "Meine Abmeldungen"
  "Next shift required in": "Nächste Schicht erforderlich in"
  "Your membership will be frozen in": "Deine Mitgliedschaft wird eingefroren in"
  "You are": "Du bist"
  "days late to do your next shift.": "Tage zu spät, um deine nächste Schicht zu machen."
  "You are more than 4 weeks late to do your next shift.": "Du bist mehr als 4 Wochen zu spät, um deine nächste Schicht zu machen."
  "Please sign up for a shift or contact the membership office.": "Bitte melde dich für eine Schicht an oder kontaktiere das Mitgliederbüro."
  "You have a holiday registered at the moment.": "Du hast aktuell einen Urlaub eingetragen."
  "You cannot go shopping during this time.": "Du kannst in dieser Zeit nicht einkaufen gehen."
  "You are exempt from shift work.": "Du bist von der Schichtarbeit befreit."
  "Please do your next shift latest in": "Bitte mache deine nächste Schicht spätestens in"
  "Your membership is active. Thank you for your contribution!": "Deine Mitgliedschaft ist aktiv. Danke für deinen Beitrag!"
  "You can nonetheless sign up for shifts if you want.": "Du kannst dich trotzdem für Schichten anmelden, wenn du möchtest."
  "Your membership is currently inactive.": "Deine Mitgliedschaft ist derzeit inaktiv."
  "Please contact the membership office if you want to change your status.": "Bitte kontaktiere das Mitgliederbüro, wenn du deinen Status ändern möchtest."
  "days": "Tagen"
  "Timespan": "Zeitraum"
  "to": "bis"
  "Shifts Overview": "Schichten Übersicht"
  "Register shift": "Schicht anmelden"
  "Submit holiday": "Urlaub eintragen"
</i18n>
