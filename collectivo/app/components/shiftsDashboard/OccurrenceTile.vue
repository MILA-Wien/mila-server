<script setup lang="ts">
const MAX_DAYS_TO_SIGN_OUT_BEFORE = 2;

const { t, locale } = useI18n();

const signOutModalIsOpen = ref(false);

type AssignmentInfo = Awaited<
  ReturnType<typeof getOccurrencesUser>
>["assignments"][number];

type Occurrence = AssignmentInfo["occurrences"][number];

const props = defineProps({
  shiftAssignment: {
    type: Object as PropType<AssignmentInfo>,
    required: true,
  },
  occ: {
    type: Object as PropType<Occurrence>,
    required: true,
  },
});

const data = props.shiftAssignment;
const nextOcc = props.occ.date;
const assignment = data.assignment;
const shift = data.assignment.shifts_shift;
const user = useCurrentUser();
const emit = defineEmits(["reload"]);

async function createAbsence() {
  await $fetch("/api/shifts/absences", {
    method: "POST",
    body: {
      shifts_membership: user.value.membership!.id,
      shifts_from: props.occ.date,
      shifts_to: props.occ.date,
      shifts_is_holiday: false,
      shifts_is_for_all_assignments: false,
      shifts_assignment: assignment.id,
    },
  });

  emit("reload");
  signOutModalIsOpen.value = false;
}
</script>

<template>
  <div
    class="border border-black p-4 flex flex-wrap justify-between gap-2"
    :class="
      occ.isActive
        ? 'bg-green-50 border-green-600 border-2'
        : 'bg-gray-50 border-gray-600 text-gray-800'
    "
  >
    <div class="">
      <div :class="occ.isActive ? '' : ''">
        <span class="font-bold">
          {{
            getDateTimeWithTimeSpanString(
              shift.shifts_from_time,
              shift.shifts_to_time,
              occ.date,
              locale,
              t,
            )
          }}
        </span>
      </div>

      <div class="mt-2 cursor-default">
        <span
          v-if="!occ.isActive"
          class="bg-gray-600 text-sm py-1 px-2 text-white font-bold mr-2"
        >
          <span v-if="occ.isHoliday">
            {{ t("ON HOLIDAY") }}
          </span>
          <span v-else-if="occ.isOtherAbsence">
            {{ t("SIGNED OUT") }}
          </span>
          <span v-else-if="occ.isPublicHoliday">
            {{ t("PUBLIC HOLIDAY") }}
          </span>
        </span>
        <span
          v-else
          class="bg-green-600 text-sm py-1 px-2 text-white font-bold mr-2"
        >
          {{ t("SIGNED IN") }}
        </span>
      </div>
    </div>
    <div class="flex flex-warp items-start gap-2" v-if="occ.isActive">
      <UButton size="xs" variant="outline" @click="signOutModalIsOpen = true"
        >{{ t("Sign out") }}
      </UButton>
      <ShiftsDashboardDownloadIcsButton
        :shiftAssignment="shiftAssignment"
        :occ="occ"
      />
    </div>
  </div>

  <!-- Signout Modal -->
  <UModal v-model:open="signOutModalIsOpen">
    <template #content>
      <div
        v-if="dateWithinTimeSpan(nextOcc, MAX_DAYS_TO_SIGN_OUT_BEFORE)"
        class="p-8 flex flex-col gap-2"
      >
        <h2>{{ t("Sign out") }}</h2>

        <p>{{ t("Sign out from the following occurrence") }}:</p>
        <p>
          {{
            getDateTimeWithTimeSpanString(
              shift.shifts_from_time,
              shift.shifts_to_time,
              nextOcc,
              locale,
              t,
            )
          }}
        </p>
        <p v-if="assignment.shifts_is_regular">
          <span class="font-bold">{{ t("Attention") }}:</span>
          {{ t("t:signout_regular") }}
        </p>
        <div class="flex flex-wrap gap-2 mt-4 justify-end">
          <UButton color="gray" @click="signOutModalIsOpen = false">
            {{ t("Cancel") }}
          </UButton>
          <UButton @click="createAbsence">{{ t("Sign out") }}</UButton>
        </div>
      </div>
      <div v-else class="p-8 flex flex-col gap-2">
        <h2>{{ t("Sign out") }}</h2>
        <p>
          {{
            t("Sign-out is not possible anymore. Please contact the office.")
          }}
        </p>
        <UButton size="sm" to="help">{{ t("Contact") }}</UButton>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
en:
  "t:signout_regular": "You are only unsubscribed for this date – future events are not affected. For a permanent unsubscription, please contact the membership office."
de:
  "SIGNED OUT": "ABGEMELDET"
  "SIGNED IN": "ANGEMELDET"
  "ON HOLIDAY": "AUF URLAUB"
  "PUBLIC HOLIDAY": "FEIERTAG"
  "Next occurrences": "Nächste Termine"
  "Shift": "Schicht"
  "Absences": "Abwesenheiten"
  "One-time shift": "Einmalige Schicht"
  "from": "von"
  "to": "bis"
  "until": "bis"
  "You": "Du"
  "Sign out": "Abmelden"
  "Sign out from the following occurrence": "Von folgendem Termin abmelden"
  "t:signout_regular": "Du wirst nur für dieses Datum abgemeldet, nicht jedoch für zukünftige Termine. Für eine dauerhafte Abmeldung wende dich bitte an das Mitgliederbüro."
  "Sign-out is not possible anymore. Please contact the office.": "Abmeldung ist nicht mehr möglich. Bitte kontaktiere das Mitgliederbüro."
  "Cancel": "Abbrechen"
  "Attention": "Achtung"
</i18n>
