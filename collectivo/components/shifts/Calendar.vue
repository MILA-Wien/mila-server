<script setup lang="ts">
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";

import type { CalendarOptions, CalendarApi } from "@fullcalendar/core";

const props = defineProps({
  mode: {
    type: String as PropType<"jumper" | "admin">,
    default: null,
  },
});
const { locale, t } = useI18n();
const user = useCollectivoUser();
const shiftActionModalisOpen = ref(false);
const selectedShiftOccurence = ref(null);
const adminMode = props.mode === "admin";
const colors = ["#2E8B57", "#FF8C00", "#B22222"];

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
      selectedShiftOccurence.value = info.event.extendedProps.shiftOccurence;
      shiftActionModalisOpen.value = true;
    }
  },
});

// Set up calendar filters (async)
// Admin view includes all categories + filters
// User view includes only allowed categories
const calendarFilters = ref<ShiftsFilterState>({
  filters: [
    {
      label: "Kein Filter",
      value: "none",
    },
  ],
  selectedFilter: {
    label: "Kein Filter",
    value: "none",
  },
  categories: [
    {
      id: 0,
      name: "Normal",
    },
  ],
  selectedCategory: {
    id: 0,
    name: "Normal",
  },
});
props.mode == "admin" ? loadFiltersAdmin() : loadFiltersUser();
async function loadFiltersAdmin() {
  calendarFilters.value.filters.push({
    label: "Unfilled shifts",
    value: "unfilled",
  });
  calendarFilters.value.categories.unshift({
    id: -1,
    name: "Alle",
  });
  calendarFilters.value.selectedCategory = {
    id: -1,
    name: "Alle",
  };
  calendarFilters.value.categories.push(
    ...(await useShiftsCategories().loadPromise),
  );
}
async function loadFiltersUser() {
  for (const category of user.value.membership?.shifts_categories_allowed ||
    []) {
    calendarFilters.value.categories.push(category.shifts_category_id);
  }
}

// Mount component and load events
onMounted(async () => {
  loadEvents(true);

  // Watch changes in date selection and update events
  const calendar = await calendarRef.value!.getApi();
  calendar.on("datesSet", (infos) => {
    console.log("datesSet", infos);
    loadEventsInner(infos.start, infos.end, true);
  });
});

// Watch changes in settings and update events
watch(
  [
    () => calendarFilters.value.selectedFilter,
    () => calendarFilters.value.selectedCategory,
  ],
  (_) => {
    loadEvents();
  },
);

// Watch changes in locale (needs re-render)
const showCalendar = ref(true);
watch(locale, () => {
  showCalendar.value = false;
  calendarOptions.value.locale = locale.value;
  loadEvents();
  showCalendar.value = true;
});

// Fetch events based on selected calendar dates
const loadEvents = async (reload = false) => {
  const calendar = await calendarRef.value!.getApi();
  await loadEventsInner(
    calendar.view.activeStart,
    calendar.view.activeEnd,
    reload,
  );
};

const currentOccurrences = ref<ShiftOccurrence[]>([]);

// Fetch events based on given timespan
async function loadEventsInner(from: Date, to: Date, reload: boolean = false) {
  // Fetch shift occurrences from API
  if (reload) {
    currentOccurrences.value = await $fetch("/api/shifts/occurrences", {
      query: {
        from: from.toISOString(),
        to: to.toISOString(),
        admin: adminMode,
      },
    });
  }

  if (!currentOccurrences.value) return;

  // Prepare events array
  const events = [];
  const allCats = calendarFilters.value.selectedCategory.id === -1;
  const unfilled = calendarFilters.value.selectedFilter.value === "unfilled";

  // Add public holidays
  const publicHolidays = await getPublicHolidays();
  for (const date of publicHolidays) {
    events.push({
      title: t("Public holiday"),
      start: date,
      allDay: true,
      color: "gray",
    });
  }

  // Add shift occurrences
  for (const occurrence of currentOccurrences.value) {
    const n_missing = occurrence.shift.shifts_slots - occurrence.n_assigned;
    const start = new Date(occurrence.start);
    const isPast = start < new Date();
    let title = occurrence.shift.shifts_name;
    let color = "";

    if (props.mode === "admin") {
      color = isPast
        ? "#808080"
        : colors[n_missing >= 0 && n_missing < 3 ? n_missing : 2];
    } else {
      color = colors[0];
      if (occurrence.selfAssigned) {
        // Do not add occurrences that the user themselves is already assigned to
        continue;
      }
    }

    // Special: show operativo names
    if (props.mode === "admin" && !isPast) {
      title +=
        " [" +
        occurrence.n_assigned +
        "/" +
        occurrence.shift.shifts_slots +
        "]";
    }

    // Apply filters
    if (unfilled && occurrence.n_assigned >= occurrence.shift.shifts_slots) {
      continue;
    }

    if (
      calendarFilters.value.selectedCategory.id == 0 &&
      occurrence.shift.shifts_category_2 != null
    ) {
      continue;
    }

    if (
      !allCats &&
      calendarFilters.value.selectedCategory.id != 0 &&
      occurrence.shift.shifts_category_2 !==
        calendarFilters.value.selectedCategory.id
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
</script>

<template>
  <div v-if="showCalendar" class="">
    <ShiftsCalendarHeader
      v-if="calendarRef"
      v-model="calendarFilters"
      :calendar-api="calendarRef.getApi()"
    />
    <full-calendar ref="calendarRef" :options="calendarOptions" />
  </div>
  <template v-if="adminMode">
    <ShiftsCalendarModalAdmin
      v-if="shiftActionModalisOpen && selectedShiftOccurence"
      v-model:is-open="shiftActionModalisOpen"
      :shift-occurence="selectedShiftOccurence"
      @data-has-changed="loadEvents"
    />
  </template>
  <template v-else>
    <ShiftsCalendarModalUser
      v-if="shiftActionModalisOpen && selectedShiftOccurence"
      v-model:is-open="shiftActionModalisOpen"
      :shift-occurence="selectedShiftOccurence"
      :shift-type="props.mode"
    />
  </template>
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
