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
    type: Object as PropType<ShiftsOccurrenceDashboard>,
    required: true,
  },
});

// creates a DateTime object from the given strings, where `date` must be a string starting with format yyyy-mm-dd (e.g. an ISO-format) and `time` must be a duration in format "hh:mm:ss". Returns the so-created time of day in the Vienna timezone.
function createDateTime(date: string, time?: string) {
  const datetime = DateTime.fromISO(date.slice(0, 10), {
    zone: "Europe/Vienna",
  });
  if (time) {
    return datetime.plus(Duration.fromISOTime(time));
  }
  return datetime;
}

const data = props.shiftAssignment;
const nextOcc = data.nextOccurrence!;
const assignment = data.assignment;
const coworkers = data.coworkers;
const coordinators = data.coordinators || [];
const shift = data.assignment.shifts_shift;
const time_from = shift.shifts_from_time; // string in format hh:mm
const time_to = shift.shifts_to_time; // string in format hh:mm
const nextOccurrenceStart = createDateTime(nextOcc, time_from); // DateTime object representing the occurrence's start, including time of day
const nextOccurrenceEnd = createDateTime(nextOcc, time_to); // DateTime object representing the occurrence's end, including time of day
const user = useCurrentUser();
const emit = defineEmits(["reload"]);

function getEndDate(endDate: string) {
  return DateTime.fromISO(endDate).toLocaleString(DateTime.DATE_MED);
}

async function createAbsence() {
  await directus.request(
    createItem("shifts_absences", {
      shifts_membership: user.value.membership!.id,
      shifts_from: nextOcc,
      shifts_to: nextOcc,
      shifts_is_holiday: false,
      shifts_is_for_all_assignments: false,
      shifts_assignment: assignment.id,
    }),
  );

  emit("reload");
  signOutModalIsOpen.value = false;
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
      (data.isRegular
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
    regular: data.isRegular,
    regularity: shift.shifts_repeats_every,
    regularity_until: shift.shifts_to,
  };

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  let rrule_line = "";
  if (event.regular) {
    rrule_line = `RRULE:FREQ=DAILY;INTERVAL=${event.regularity}`;
    if (event.regularity_until) {
      rrule_line += `;UNTIL=${formatDate(DateTime.fromISO(event.regularity_until, { locale: locale.value }).toJSDate())}`;
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
  <div v-if="nextOcc">
    <CollectivoCard>
      <div class="flex flex-wrap justify-between items-start">
        <div class="flex-1 min-w-60">
          <h4>
            {{
              getDateTimeWithTimeSpanString(
                shift.shifts_from_time,
                shift.shifts_to_time,
                nextOcc,
                locale,
                t,
              )
            }}
          </h4>

          <!-- Repetition info -->
          <template v-if="data.secondNextOccurence">
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
            {{ t("Coordinator") }}:
            <span v-for="(item, index) in coordinators" :key="index">
              {{ item === "" ? t("Anonymous") : item
              }}<span v-if="index < coordinators.length - 1">, </span>
            </span>
          </p>

          <!-- Shift coworkers -->
          <p v-if="coworkers.length > 0">
            {{ t("Shift team") }}:
            <span v-for="(item, index) in coworkers" :key="index">
              {{ item === "" ? t("Anonymous") : item
              }}<span v-if="index < coworkers.length - 1">, </span>
            </span>
          </p>

          <p v-if="shift.shifts_name">
            {{ t("Shift") }}ID: {{ shift.shifts_name }}
          </p>

          <!-- Shift infos -->
          <!-- eslint-disable vue/no-v-html -->
          <p
            v-if="shift.shifts_description"
            class="pt-4"
            v-html="parse(shift.shifts_description)"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>

        <!-- Space for buttons -->
        <div class="flex flex-wrap gap-3">
          <UButton size="sm" color="yellow" @click="downloadICS()"
            >{{ t("Calendar download") }}
          </UButton>
          <!-- v-if="!assignment.shifts_is_regular" -->
          <UButton size="sm" color="green" @click="signOutModalIsOpen = true"
            >{{ t("Sign out") }}
          </UButton>
        </div>
      </div>
    </CollectivoCard>

    <!-- Signout Modal -->
    <UModal v-model="signOutModalIsOpen">
      <div
        v-if="dateWithinTimeSpan(nextOcc, MAX_DAYS_TO_SIGN_OUT_BEFORE)"
        class="p-8 flex flex-col gap-2"
      >
        <h2>{{ t("Sign out") }}</h2>

        <p>{{ t("Sign out from the following shift") }}:</p>
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
          <UButton size="sm" @click="createAbsence">{{
            t("Sign out")
          }}</UButton>
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
    </UModal>
  </div>
</template>

<i18n lang="yaml">
en:
  "t:signout_regular": "You are only unsubscribed for this date – future events are not affected. For a permanent unsubscription, please contact the membership office."
  "ics_preamble": "Warning: This calendar entry will not be automatically updated if your shift schedule changes. You can view your current shift schedule online in the member area. Please remember to delete old calendar entries and create a new one if your shift schedule changes."
  "Calendar download": "Calendar export"
de:
  "Shift": "Schicht"
  "Absences": "Abwesenheiten"
  "One-time shift": "Einmalige Schicht"
  "Regular shift: This signup repeats every": "Festschicht: Diese Schicht wiederholt sich alle"
  "days": "Tage"
  "weeks": "Wochen"
  "from": "von"
  "to": "bis"
  "until": "bis"
  "You": "Du"
  "Sign out": "Abmelden"
  "Coordinator": "Koordinator*in"
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
  "ics_preamble": "Achtung: Dieser Kalendereintrag wird nicht automatisch aktualisiert, falls sich deine Schichteinteilung ändert. Deine aktuelle Schichteinteilung siehst du online im Mitgliederbereich. Denke bei Änderungen der Schichteinteilung bitte daran, alte Kalendereinträge zu löschen und dir einen neuen Kalendereintrag zu erstellen."
</i18n>
