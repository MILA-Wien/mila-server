<script setup lang="ts">
import { createItem } from "@directus/sdk";
import { DateTime, Duration } from "luxon";
import { parse } from "marked";

const MAX_DAYS_TO_SIGN_OUT_BEFORE = 2;

const { t, locale } = useI18n();
const directus = useDirectus();
const signOutModalIsOpen = ref(false);

const props = defineProps({
  shiftAssignment: {
    type: Object as PropType<ShiftsAssignmentInfos>,
    required: true,
  },
});

// This is the next occurence of the assignment, not the shift itself!
const ass = props.shiftAssignment;
const nextOccurrence = ass.nextOccurrence as String; // Date without time
const nextOccurrenceAbsent = ass.nextOccurrenceAbsent;
const assignment = ass.assignment;
const coworkers = ass.coworkers;
const shift = assignment.shifts_shift as ShiftsShift;
const nextOccurrenceStart = DateTime.fromISO(nextOccurrence, locale).plus(
  Duration.fromISOTime(shift.shifts_from_time),
); // DateTime object representing the occurrence's start, including time of day
const nextOccurrenceEnd = DateTime.fromISO(nextOccurrence, locale).plus(
  Duration.fromISOTime(shift.shifts_to_time),
); // DateTime object representing the occurrence's end, including time of day
const user = useCurrentUser();
const emit = defineEmits(["reload"]);

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
    shifts_from: nextOccurrence,
    shifts_to: nextOccurrence,
    shifts_is_holiday: false,
    shifts_is_for_all_assignments: false,
    shifts_assignment: assignment.id,
  } as ShiftsAbsence;

  await directus.request(createItem("shifts_absences", payload));

  emit("reload");
  signOutModalIsOpen.value = false;
}

function getColor() {
  if (nextOccurrenceAbsent) {
    return "gray";
  } else if (props.shiftAssignment.isRegular) {
    return "blue";
  } else {
    return "green";
  }
}

function downloadICS() {
  // downloads the next occurrence as a ICS calendar entry file, and if it is a regular shift assignment, as a recurring event.
  const event = {
    title: "MILA " + t("Shift"),
    description:
      t("ics_preamble") +
      "\\n*****\\n\\n" +
      t("Shift") +
      " " +
      shift.shifts_name +
      " (" +
      (ass.isRegular
        ? t("Shift repeats every") +
          " " +
          shift.shifts_repeats_every +
          " " +
          t("days")
        : t("One-time shift")) +
      ")",
    location: "MILA",
    start: nextOccurrenceStart.toJSDate(),
    end: nextOccurrenceEnd.toJSDate(),
    uid: assignment.id,
    timestamp: new Date(),
    regular: ass.isRegular,
    regularity: shift.shifts_repeats_every,
    regularity_until: shift.shifts_to,
  };

  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  let rrule_line = "";
  if (event.regular) {
    rrule_line = `RRULE:FREQ=DAILY;INTERVAL=${event.regularity}`;
    if (event.regularity_until) {
      rrule_line += `;UNTIL=${formatDate(DateTime.fromISO(event.regularity_until, locale).toJSDate())}`;
    }
    rrule_line += `
`;
  }

  const icsContent =
    `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MILA//Collectivo//EN
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
DTSTART:${formatDate(event.start)}
DTEND:${formatDate(event.end)}
UID:${event.uid}
DTSTAMP:${formatDate(event.timestamp)}
` +
    rrule_line +
    `END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "event.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div v-if="nextOccurrence">
    <CollectivoCard :color="getColor()">
      <div class="flex flex-wrap justify-between items-start">
        <div class="flex-1 min-w-60">
          <h4>
            {{
              getDateTimeWithTimeSpanString(shift, nextOccurrence, locale, t)
            }}
            <span v-if="shift.shifts_name"> ({{ shift.shifts_name }})</span>
          </h4>
          <!-- Repetition info -->
          <p v-if="!(shift.shifts_repeats_every && shiftAssignment.isRegular)">
            {{ t("One-time shift") }}
          </p>
          <template v-else>
            <p>
              {{ t("Shift repeats every") }}
              {{ shift.shifts_repeats_every / 7 }}
              {{ t("weeks") }}

              <span v-if="assignment.shifts_to">
                {{ t("until") }} {{ getEndDate(assignment.shifts_to) }}
              </span>
            </p>
          </template>

          <!-- Shift coworkers -->
          <p v-if="coworkers.length > 0">
            {{ t("Registered") }}:
            <span v-for="(item, index) in coworkers" :key="index">
              {{ item === " " ? t("[name hidden]") : item
              }}<span v-if="index < coworkers.length - 1">, </span>
            </span>
          </p>

          <!-- Shift infos -->
          <!-- eslint-disable vue/no-v-html -->
          <p
            v-if="shift.shifts_description"
            v-html="parse(shift.shifts_description)"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
        <!-- Space for buttons -->
        <div class="flex flex-wrap gap-3">
          <UButton size="sm" color="yellow" @click="downloadICS()"
            >{{ t("Calendar download") }}
          </UButton>
          <UButton
            v-if="!assignment.shifts_is_regular"
            size="sm"
            color="green"
            @click="signOutModalIsOpen = true"
            >{{ t("Sign out") }}
          </UButton>
        </div>
      </div>
    </CollectivoCard>

    <!-- Signout Modal -->
    <UModal v-model="signOutModalIsOpen">
      <div
        class="p-8 flex flex-col gap-2"
        v-if="dateWithinTimeSpan(nextOccurrence, MAX_DAYS_TO_SIGN_OUT_BEFORE)"
      >
        <h2>{{ t("Shift Sign-Out") }}</h2>

        <p>{{ t("Sign out from the following shift") }}:</p>
        <p>
          {{ getDateTimeWithTimeSpanString(shift, nextOccurrence, locale, t) }}
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
      <div v-else class="p-8 flex flex-col gap-2">
        <h2>{{ t("Shift Sign-Out") }}</h2>
        <p>
          {{
            t("Sign-out is not possible anymore. Please contact the office.")
          }}
        </p>
        <UButton size="sm" to="help">{{ t("Contact") }}</UButton>
      </div>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
en:
  "ics_preamble": "Warning: This calendar entry will not be automatically updated if your shift schedule changes. You can view your current shift schedule online in the member area. Please remember to delete old calendar entries and create a new one if your shift schedule changes."
  "Calendar download": "Calendar export"
de:
  "until": "bis"
  "Shift repeats every": "Schicht wiederholt sich alle"
  "days": "Tage"
  "weeks": "Wochen"
  "from": "von"
  "to": "bis"
  "Absences": "Abwesenheiten"
  "One-time shift": "Einmalige Schicht"
  "Location": "Ort"
  "Shift name": "Schichtname"
  "Sign out": "Abmelden"
  "Shift Sign-Out": "Schicht Abmeldung"
  "Sign out from the following shift": "Von folgender Schicht abmelden"
  "Registered": "Angemeldet"
  "[name hidden]": "[Name verborgen]"
  "Contact": "Kontakt"
  "Sign-out is not possible anymore. Please contact the office.": "Abmeldung ist nicht mehr möglich. Bitte kontaktiere das Mitgliederbüro."
  "Calendar download": "Kalender-Export"
  "Shift": "Schicht"
  "ics_preamble": "Achtung: Dieser Kalendereintrag wird nicht automatisch aktualisiert, falls sich deine Schichteinteilung ändert. Deine aktuelle Schichteinteilung siehst du online im Mitgliederbereich. Denke bei Änderungen der Schichteinteilung bitte daran, alte Kalendereinträge zu löschen und dir einen neuen Kalendereintrag zu erstellen."
</i18n>
