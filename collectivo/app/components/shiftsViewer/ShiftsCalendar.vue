<script setup lang="ts">
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";

import type { CalendarOptions, CalendarApi } from "@fullcalendar/core";

const props = defineProps({
  admin: {
    type: Boolean,
    default: false,
  },
  events: {
    type: Object,
    required: true,
  },
  status: {
    type: String,
    default: "all",
  },
  category: {
    type: Number,
    default: -1,
  },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  allowedCategories: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
});

const { locale, t } = useI18n();

const emit = defineEmits(["openOccurrence"]);

// Set up full calendar
// Dates are used without time, time always being set to UTC 00:00
const calendarRef = ref<{ getApi: () => CalendarApi } | null>(null);
const calendarOptions: Ref<CalendarOptions> = ref({
  timeZone: "UTC",
  plugins: [dayGridPlugin, listPlugin, timeGridPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  headerToolbar: false,
  firstDay: 1, // Monday
  locale: locale.value,
  events: [],
  eventDisplay: "block",
  height: "auto",
  allDaySlot: false,
  displayEventTime: true,
  displayEventEnd: true,
  eventTimeFormat: {
    hour: "2-digit",
    minute: "2-digit",
    meridiem: false,
    hour12: false,
  },
  nowIndicator: true,
  eventClick: (info) => {
    const prop = info.event.extendedProps;

    if (prop.shiftOccurence) {
      emit("openOccurrence", prop.shiftOccurence);
    }
  },
});

onMounted(() => {
  const target = props.fromDate.toISOString().split("T")[0];
  calendarRef.value?.getApi().gotoDate(target!);
});

const colors = {
  gray: "#6d6d6d",
  red: "#942020",
  orange: "#ce6a28",
  green: "#00867a",
  blue: "#385ad8",
};

function getColor(slots: number, n_assigned: number, isPast: boolean) {
  const n_missing = slots - n_assigned;
  if (isPast) {
    return colors.gray;
  }
  if (n_missing > 1) {
    return colors.red;
  }
  if (n_missing === 1) {
    return colors.orange;
  }
  return colors.green;
}

// Fetch events based on given timespan
async function prepareEvents() {
  // Prepare events array
  const events = [];

  // Add public holidays
  for (const holiday of props.events.publicHolidays) {
    events.push({
      title: t("Public holiday"),
      start: holiday.date,
      allDay: true,
      color: colors.blue,
    });
  }

  const filterOpts = {
    status: props.status,
    category: props.category,
    allowedCategories: props.allowedCategories,
    admin: props.admin,
  };

  // Add shift occurrences
  for (const occurrence of props.events.occurrences) {
    if (!filterOccurrence(occurrence, filterOpts)) continue;

    const start = new Date(occurrence.start);
    const isPast = start < new Date();
    let title = occurrence.shift.shifts_name;

    const color = getColor(
      occurrence.shift.shifts_slots,
      occurrence.n_assigned,
      isPast,
    );

    // Show slot status for future shifts in admin mode
    if (props.admin && !isPast) {
      title +=
        " [" +
        occurrence.n_assigned +
        "/" +
        occurrence.shift.shifts_slots +
        "]";
    }

    events.push({
      title: title,
      start: occurrence.start,
      end: occurrence.end,
      allDay: occurrence.shift.shifts_is_all_day,
      shiftOccurence: occurrence,
      color: color,
    });
  }

  calendarOptions.value.events = events;
}

prepareEvents();
</script>

<template>
  <full-calendar ref="calendarRef" :options="calendarOptions" />
  <div class="pt-10 text-gray-500">
    <div class="font-bold">
      {{ t("Legend") }}
    </div>
    <template v-if="events.skills.length > 0">
      <p>{{ t("skills_heading") }}</p>
      <ul class="ml-4 list-disc">
        <li
          v-for="skill in events.skills"
          :key="skill.icon"
        >
          {{ skill.icon }}: {{ locale.startsWith('de') ? skill.name_de : skill.name_en }}
        </li>
      </ul>
    </template>
    <p class="">
      Buddy (BETA): {{ t("buddy_description") }}
    </p>
    <p class="">
      {{ t("color_red") }} <br />
      {{ t("color_orange") }} <br />
      {{ t("color_green") }} <br />
      {{ t("color_gray") }} <br />
      {{ t("color_blue") }} <br />
    </p>
  </div>
</template>

<style scoped>
:deep(.fc-event) {
  cursor: pointer;
}
:deep(.fc-event-title) {
  white-space: pre-line;
}
:deep(.fc-event-main-frame) {
  flex-direction: column;
}
</style>

<i18n lang="yaml">
en:
  "skills_heading": "Available skills:"
  "buddy_description": "This shift has a buddy"
  "color_red": "Red: This shift is severely understaffed (more than 1 slot open)"
  "color_orange": "Orange: This shift is slightly understaffed (1 slot open)"
  "color_green": "Green: This shift is fully staffed"
  "color_gray": "Gray: Past shift"
  "color_blue": "Blue: Public holiday"
de:
  "skills_heading": "Vorhandene Fähigkeiten:"
  "Public holiday": "Feiertag"
  "Legend": "Legende"
  "buddy_description": "In dieser Schicht gibt es einen Buddy"
  "color_red": "Rot: Diese Schicht ist stark unterbesetzt (mehr als 1 Platz frei)"
  "color_orange": "Orange: Diese Schicht ist leicht unterbesetzt (1 Platz frei)"
  "color_green": "Grün: Diese Schicht ist voll besetzt"
  "color_gray": "Grau: Vergangene Schicht"
  "color_blue": "Blau: Feiertag"
</i18n>
