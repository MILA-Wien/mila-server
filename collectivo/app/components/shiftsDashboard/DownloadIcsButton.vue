<script setup lang="ts">
import { DateTime, Duration } from "luxon";

const { t, locale } = useI18n();

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
const time_from = shift.shifts_from_time; // string in format hh:mm
const time_to = shift.shifts_to_time; // string in format hh:mm
const nextOccurrenceStart = createDateTime(nextOcc, time_from); // DateTime object representing the occurrence's start, including time of day
const nextOccurrenceEnd = createDateTime(nextOcc, time_to); // DateTime object representing the occurrence's end, including time of day

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
  <UButton size="xs" variant="outline" color="gray" @click="downloadICS()"
    >{{ t("Calendar download") }}
  </UButton>
</template>

<i18n lang="yaml">
en:
  "ics_preamble": "Warning: This calendar entry will not be automatically updated if your shift schedule changes. You can view your current shift schedule online in the member area. Please remember to delete old calendar entries and create a new one if your shift schedule changes."
  "Calendar download": "Calendar export"
de:
  "Shift": "Schicht"
  "Absences": "Abwesenheiten"
  "One-time shift": "Einmalige Schicht"
  "from": "von"
  "to": "bis"
  "until": "bis"
  "You": "Du"
  "Sign out": "Abmelden"
  "Calendar download": "Kalender-Export"
  "Cancel": "Abbrechen"
  "ics_preamble": "Achtung: Dieser Kalendereintrag wird nicht automatisch aktualisiert, falls sich deine Schichteinteilung ändert. Deine aktuelle Schichteinteilung siehst du online im Mitgliederbereich. Denke bei Änderungen der Schichteinteilung bitte daran, alte Kalendereinträge zu löschen und dir einen neuen Kalendereintrag zu erstellen."
</i18n>
