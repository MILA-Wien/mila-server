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
    type: Object as PropType<ApiShiftsUserAssignmentInfos>,
    required: true,
  },
});

function createDateTime(date: string, time?: string) {
  const datetime = DateTime.fromISO(date, { locale: locale.value });
  if (time) {
    return datetime.plus(Duration.fromISOTime(time));
  }
  return datetime;
}

const ass = props.shiftAssignment as ApiShiftsUserAssignmentInfos;

if (!ass.nextOccurrence) {
  throw new Error("Needs next occurrence");
}

const nextOcc = ass.nextOccurrence as string;
const nextOccurrenceAbsent = ass.nextOccurrenceAbsent;
const nextOccurrenceWithAbsences = ass.nextOccurrenceWithAbsences as string;
const assignment = ass.assignment;
const coworkers = ass.coworkers;
const shift = ass.assignment.shifts_shift;
const time_from = shift.shifts_from_time;
const time_to = shift.shifts_to_time;
const nextOccurrenceStart = createDateTime(nextOcc, time_from);
const nextOccurrenceEnd = createDateTime(nextOcc, time_to);
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

function getTileColor() {
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
    <CollectivoCard :color="getTileColor()">
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
            <span v-if="shift.shifts_name"> ({{ shift.shifts_name }})</span>
          </h4>

          <!-- Repetition info -->
          <template
            v-if="shift.shifts_repeats_every && shiftAssignment.isRegular"
          >
            <p>
              {{ t("This shift repeats every") }}
              {{ shift.shifts_repeats_every / 7 }}
              {{ t("weeks") }}

              <span v-if="assignment.shifts_to">
                {{ t("until") }} {{ getEndDate(assignment.shifts_to) }}
              </span>
            </p>
          </template>

          <!-- Shift coworkers -->
          <p>
            {{ t("Assigned people") }}: {{ t("You")
            }}<span v-for="(item, index) in coworkers" :key="index"
              >, {{ item === " " ? t("Anonymous") : item }}
            </span>
          </p>

          <!-- Signed out info -->
          <template v-if="nextOccurrenceAbsent">
            <p class="pt-4 font-bold">
              {{ t("You are signed out for this shift") }}
            </p>
            <p v-if="nextOccurrenceWithAbsences">
              {{ t("Your next date: ") }}
              {{ getDateString(nextOccurrenceWithAbsences, locale) }}
            </p>
          </template>

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
        <div v-if="!ass.nextOccurrenceAbsent" class="flex flex-wrap gap-3">
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
  "This shift repeats every": "Diese Schicht wiederholt sich alle"
  "days": "Tage"
  "weeks": "Wochen"
  "from": "von"
  "to": "bis"
  "until": "bis"
  "You": "Du"
  "Sign out": "Abmelden"
  "Sign out from the following shift": "Von folgender Schicht abmelden"
  "You are signed out for this shift": "Du bist für diese Schicht abgemeldet"
  "Your next date: ": "Dein nächster Termin: "
  "Assigned people": "Angemeldete Personen"
  "Anonymous": "Anonym"
  "Contact": "Kontakt"
  "Attention": "Achtung"
  "t:signout_regular": "Du wirst nur für dieses Datum abgemeldet, nicht jedoch für zukünftige Termine. Für eine dauerhafte Abmeldung wende dich bitte an das Mitgliederbüro."
  "Sign-out is not possible anymore. Please contact the office.": "Abmeldung ist nicht mehr möglich. Bitte kontaktiere das Mitgliederbüro."
  "Calendar download": "Kalender-Export"
  "ics_preamble": "Achtung: Dieser Kalendereintrag wird nicht automatisch aktualisiert, falls sich deine Schichteinteilung ändert. Deine aktuelle Schichteinteilung siehst du online im Mitgliederbereich. Denke bei Änderungen der Schichteinteilung bitte daran, alte Kalendereinträge zu löschen und dir einen neuen Kalendereintrag zu erstellen."
</i18n>
