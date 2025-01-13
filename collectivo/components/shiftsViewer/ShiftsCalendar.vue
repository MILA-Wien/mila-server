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
    type: Object as PropType<ShiftOccurrenceApiResponse>,
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
const colors = ["#00867a", "#ce6a28", "#942020"];
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
  calendarRef.value?.getApi().gotoDate(target);
});

// Fetch events based on given timespan
async function prepareEvents() {
  // Prepare events array
  const events = [];
  const allCats = props.category === -1;
  const unfilled = props.status === "unfilled";

  // Add public holidays
  for (const holiday of props.events.publicHolidays) {
    events.push({
      title: t("Public holiday"),
      start: holiday.date,
      allDay: true,
      color: "#385ad8",
    });
  }

  // Add shift occurrences
  for (const occurrence of props.events.occurrences) {
    const n_missing = occurrence.shift.shifts_slots - occurrence.n_assigned;
    const start = new Date(occurrence.start);
    const isPast = start < new Date();
    let title = occurrence.shift.shifts_name;
    let color = "";

    color = isPast
      ? "#6d6d6d"
      : colors[n_missing >= 0 && n_missing < 3 ? n_missing : 2];

    // Show slot status for future shifts in admin mode
    if (props.admin && !isPast) {
      title +=
        " [" +
        occurrence.n_assigned +
        "/" +
        occurrence.shift.shifts_slots +
        "]";
    }

    // Apply filters
    if (!props.admin && occurrence.selfAssigned) {
      continue;
    }

    if (unfilled) {
      if (isPast) {
        continue;
      }
      if (occurrence.n_assigned >= occurrence.shift.shifts_slots) {
        continue;
      }
    }

    if (props.category == 0 && occurrence.shift.shifts_category_2 != null) {
      continue;
    }

    if (
      !allCats &&
      props.category != 0 &&
      occurrence.shift.shifts_category_2 !== props.category
    ) {
      continue;
    }

    if (
      allCats &&
      !(occurrence.shift.shifts_category_2 === null) &&
      !props.allowedCategories.includes(occurrence.shift.shifts_category_2)
    ) {
      continue;
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
<!-- calendarRef.getApi() -->
<template>
  <full-calendar ref="calendarRef" :options="calendarOptions" />
</template>

<style scoped>
/* Cursor style on calendar events */
:deep(.fc-event) {
  cursor: pointer;
}

/* Allows line break in calendar events */
:deep(.fc-event-title) {
  white-space: pre-line;
}
:deep(.fc-event-main-frame) {
  flex-direction: column;
}
</style>

<i18n lang="yaml">
de:
  "Public holiday": "Feiertag"
</i18n>
