<script setup lang="ts">
import { createItem } from "@directus/sdk";
import { DateTime } from "luxon";
import { parse } from "marked";

const { t } = useI18n();
const directus = useDirectus();
const signOutModalIsOpen = ref(false);
const props = defineProps({
  shiftAssignment: {
    type: Object as PropType<ShiftsAssignmentRules>,
    required: true,
  },
});

// This is the next occurence of the assignment, not the shift itself!
const nextOccurrence = props.shiftAssignment.nextOccurrence;
const assignment = props.shiftAssignment.assignment as ShiftsAssignment;
const absences = props.shiftAssignment.absences as ShiftsAbsence[];
const shift = assignment.shifts_shift as ShiftsShift;
const user = useCollectivoUser();
const emit = defineEmits(["reload"]);

function getTimeString(occurence: string) {
  const occ = DateTime.fromISO(occurence);
  const weekday = occ.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
  const startTime = shift.shifts_from_time?.slice(0, 5);
  const endTime = shift.shifts_to_time?.slice(0, 5);

  if (!startTime || !endTime) {
    return weekday;
  }

  return `${weekday} ${t("from")} ${startTime} ${t("to")} ${endTime}`;
}

function getEndDate(endDate: string) {
  return DateTime.fromISO(endDate).toLocaleString(DateTime.DATE_MED);
}

async function requestSignOut() {
  console.log("Request sign-out");
  if (!nextOccurrence || !user.value.membership) {
    return;
  }

  const payload = {
    shifts_status: "accepted",
    shifts_membership: user.value.membership?.id,
    shifts_from: nextOccurrence.toISOString(),
    shifts_to: nextOccurrence.toISOString(),
    shifts_is_holiday: false,
    shifts_is_for_all_assignments: false,
    shifts_assignment: assignment.id,
  } as ShiftsAbsence;

  await directus.request(createItem("shifts_absences", payload));

  emit("reload");
  signOutModalIsOpen.value = false;
}
</script>

<template>
  <div v-if="nextOccurrence">
    <CollectivoCard
      :title="getTimeString(nextOccurrence)"
      :color="shiftAssignment.isRegular ? 'primary' : 'green'"
    >
      <div>
        <!-- Repetition info -->
        <p v-if="shift.shifts_repeats_every && shiftAssignment.isRegular">
          {{ t("Shift repeats every") }} {{ shift.shifts_repeats_every }}
          {{ t("days") }}

          <span v-if="assignment.shifts_to">
            {{ t("until") }} {{ getEndDate(assignment.shifts_to) }}
          </span>
        </p>
        <p v-else>
          {{ t("One-time shift") }}
        </p>

        <!-- Absences -->
        <p v-if="absences.length > 0" class="mt-2">
          {{ t("Absences") }}:

          <span
            v-for="absenceDate in shiftAssignment.absencesRule.all()"
            :key="absenceDate"
          >
            {{
              DateTime.fromJSDate(absenceDate).toLocaleString(DateTime.DATE_MED)
            }}
            &nbsp;
          </span>
        </p>

        <!-- Shift name -->
        <p class="mt-2">{{ t("Shift name") }}: {{ shift.shifts_name }}</p>

        <!-- Shift location -->
        <p v-if="shift.shifts_location">
          {{ t("Location") }}: {{ shift.shifts_location }}
        </p>

        <!-- Shift infos -->
        <!-- eslint-disable vue/no-v-html -->
        <p
          v-if="shift.shifts_description"
          v-html="parse(shift.shifts_description)"
        />
        <!-- eslint-enable vue/no-v-html -->

        <!-- Space for buttons -->
        <div class="flex flex-wrap gap-3 pt-4">
          <UButton
            v-if="!assignment.shifts_is_regular"
            size="sm"
            @click="signOutModalIsOpen = true"
            >{{ t("Sign out") }}
          </UButton>
        </div>
      </div>
    </CollectivoCard>

    <!-- Signout Modal -->
    <UModal v-model="signOutModalIsOpen">
      <div class="p-8 flex flex-col gap-2">
        <h2>{{ t("Shift Sign-Out") }}</h2>

        <p>{{ t("Sign out from the following shift") }}:</p>
        <p>
          {{ getTimeString(nextOccurrence) }}
        </p>
        <div class="flex flex-wrap gap-2 mt-4 justify-end">
          <UButton color="gray" @click="signOutModalIsOpen = false">
            {{ t("Cancel") }}
          </UButton>
          <UButton size="sm" @click="requestSignOut">{{
            t("Sign out")
          }}</UButton>
        </div>
      </div>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
de:
  "until": "bis"
  "Shift repeats every": "Schicht wiederholt sich alle"
  "days": "Tage"
  "from": "von"
  "to": "bis"
  "Absences": "Abwesenheiten"
  "One-time shift": "Einmalige Schicht"
  "Location": "Ort"
  "Shift name": "Schichtname"
  "Sign out": "Abmelden"
  "Shift Sign-Out": "Schicht Abmeldung"
  "Sign out from the following shift": "Von folgender Schicht abmelden"
</i18n>
