<script setup lang="ts">
import { DateTime } from "luxon";
import { parse } from "marked";

const { t } = useI18n();

const props = defineProps({
  shiftAssignment: {
    type: Object as PropType<
      Awaited<ReturnType<typeof getOccurrencesUser>>["assignments"][number]
    >,
    required: true,
  },
});

const data = props.shiftAssignment;
const occurrences = data.occurrences;
const assignment = data.assignment;
const coworkers = data.coworkers;
const coordinators = data.coordinators || [];
const shift = data.assignment.shifts_shift;
const cats = useShiftsCategories();
const emit = defineEmits(["reload"]);

function getEndDate(endDate: string) {
  return DateTime.fromISO(endDate).toLocaleString(DateTime.DATE_MED);
}
</script>

<template>
  <div class="border border-black p-4">
    <div class="flex flex-wrap justify-between items-start">
      <div class="flex-1 min-w-60">
        <h4>{{ shift.shifts_name }}</h4>

        <!-- Repetition info -->
        <template v-if="data.isRegular">
          <p>
            {{ t("Regular shift: This signup repeats every") }}
            {{ shift.shifts_repeats_every! / 7 }}
            {{ t("weeks") }}

            <span v-if="assignment.shifts_to">
              {{ t("until") }} {{ getEndDate(assignment.shifts_to) }}
            </span>
          </p>
        </template>

        <!-- Shift coordinators -->
        <p v-if="coordinators.length > 0">
          {{ t("Coordination") }}:
          <span v-for="(item, index) in coordinators" :key="index">
            {{ item === "" ? t("Anonymous") : item
            }}<span v-if="index < coordinators.length - 1">, </span>
          </span>
        </p>

        <!-- Shift coworkers -->
        <p v-if="coworkers.length > 0">
          {{ t("Team") }}:
          <span v-for="(item, index) in coworkers" :key="index">
            {{ item === "" ? t("Anonymous") : item
            }}<span v-if="index < coworkers.length - 1">, </span>
          </span>
        </p>

        <!-- Shift infos -->
        <!-- eslint-disable vue/no-v-html -->
        <p
          v-if="shift.shifts_description"
          class="pt-4"
          v-html="parse(shift.shifts_description)"
        ></p>

        <div
          v-if="
            cats.dict &&
            shift.shifts_category_2 &&
            cats.dict.value[shift.shifts_category_2]
          "
          class="pt-4"
        >
          <p>
            <strong>{{ t("Category") }}:</strong>
            {{ cats.dict.value[shift.shifts_category_2]?.name }}
          </p>
          <p
            v-html="
              parse(
                cats.dict.value[shift.shifts_category_2]?.beschreibung ?? '',
              )
            "
          ></p>
        </div>

        <!-- v-html="parse(shift.shifts_category_2)" -->
        <!-- eslint-enable vue/no-v-html -->

        <p class="font-bold mt-4">{{ t("Next occurrences") }}</p>

        <div class="flex flex-col gap-2 mt-2">
          <ShiftsDashboardOccurrenceTile
            v-for="(occ, index) in occurrences"
            :key="index"
            :shift-assignment="data"
            :occ="occ"
            @reload="emit('reload')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  "t:signout_regular": "You are only unsubscribed for this date – future events are not affected. For a permanent unsubscription, please contact the membership office."
  "ics_preamble": "Warning: This calendar entry will not be automatically updated if your shift schedule changes. You can view your current shift schedule online in the member area. Please remember to delete old calendar entries and create a new one if your shift schedule changes."
  "Calendar download": "Calendar export"
de:
  "Next occurrences": "Nächste Termine"
  "Shift": "Schicht"
  "Absences": "Abwesenheiten"
  "One-time shift": "Einmalige Schicht"
  "Regular shift: This signup repeats every": "Festschicht: Diese Anmeldung wiederholt sich alle"
  "days": "Tage"
  "weeks": "Wochen"
  "from": "von"
  "to": "bis"
  "until": "bis"
  "You": "Du"
  "Coordinator": "Koordinator*in"
  "Coordination": "Koordination"
  "Sign out from the following shift": "Von folgender Schicht abmelden"
  "You are signed out for this shift": "Du bist von dieser Schicht abgemeldet"
  "Assigned people": "Angemeldete Personen"
  "Anonymous": "Anonym"
  "Name hidden": "Name verborgen"
  "Contact": "Kontakt"
  "Shift team": "Schichtteam"
  "Cancelled": "Abgemeldet"
  "Attention": "Achtung"
  "t:signout_regular": "Du wirst nur für dieses Datum abgemeldet, nicht jedoch für zukünftige Termine. Für eine dauerhafte Abmeldung wende dich bitte an das Mitgliederbüro."
  "Sign-out is not possible anymore. Please contact the office.": "Abmeldung ist nicht mehr möglich. Bitte kontaktiere das Mitgliederbüro."
  "Calendar download": "Kalender-Export"
  "Cancel": "Abbrechen"
  "ics_preamble": "Achtung: Dieser Kalendereintrag wird nicht automatisch aktualisiert, falls sich deine Schichteinteilung ändert. Deine aktuelle Schichteinteilung siehst du online im Mitgliederbereich. Denke bei Änderungen der Schichteinteilung bitte daran, alte Kalendereinträge zu löschen und dir einen neuen Kalendereintrag zu erstellen."
</i18n>
