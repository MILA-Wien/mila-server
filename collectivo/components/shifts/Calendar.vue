<script setup lang="ts">
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import luxonPlugin from "@fullcalendar/luxon3";
import { DateTime } from "luxon";
import type { CalendarOptions } from "@fullcalendar/core";

const props = defineProps({
  mode: {
    type: String,
    default: null,
  },
});

const user = useCollectivoUser();
const shiftActionModalisOpen = ref(false);
const selectedShiftOccurence = ref(null);
const showCalendar = ref(true);

// Watch locale change
const { locale } = useI18n();

// Dates are used without time, time always being set to UTC 00:00
const calendarOptions: Ref<CalendarOptions> = ref({
  timeZone: "UTC",
  plugins: [
    dayGridPlugin,
    listPlugin,
    timeGridPlugin,
    interactionPlugin,
    luxonPlugin,
  ],
  initialView: "dayGridMonth",
  headerToolbar: false,
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
    selectedShiftOccurence.value = info.event.extendedProps.shiftOccurence;
    shiftActionModalisOpen.value = true;
  },
});

watch(locale, () => {
  showCalendar.value = false;
  calendarOptions.value.locale = locale.value;
  registerEventUpdate();
  showCalendar.value = true;
});

interface ShiftType {
  label: string;
  value: string;
  icon?: string;
}

const possibleShiftTypes: { [key: string]: ShiftType } = {
  regular: {
    label: "Registration regular",
    value: "regular",
    icon: "i-heroicons-squares-plus",
  },
  jumper: {
    label: "Registration one-time",
    value: "jumper",
    icon: "i-heroicons-stop",
  },
  unfilled: {
    label: "Unfilled shifts",
    value: "unfilled",
  },
  all: {
    label: "All shifts",
    value: "all",
  },
};

const possibleShiftCategories: { [key: string]: ShiftType } = {
  all: {
    label: "Alle",
    value: "all",
  },
  normal: {
    label: "Normal",
    value: "normal",
  },
  operativos: {
    label: "Operativos",
    value: "operativos",
  },
  accounting: {
    label: "Accounting",
    value: "accounting",
  },
  "it-support": {
    label: "IT Support",
    value: "it-support",
  },
  "public-relations": {
    label: "Public relations",
    value: "public-relations",
  },
};

// List of shift categories that match with user.membership?.shifts_skills
function getUserShiftCategories() {
  const userSkills = user.value.membership?.shifts_skills || [];
  return [
    possibleShiftCategories.normal,
    ...Object.values(
      Object.fromEntries(
        Object.entries(possibleShiftCategories).filter(([key]) =>
          userSkills.includes(key),
        ),
      ),
    ),
  ];
}

const propsShiftTypeToList: { [key: string]: ShiftType[] } = {
  jumper: [possibleShiftTypes.jumper],
  admin: [possibleShiftTypes.all, possibleShiftTypes.unfilled],
};

const propsShiftCategoryToList: { [key: string]: ShiftType[] } = {
  jumper: getUserShiftCategories(), //[possibleShiftCategories.all],
  admin: [...Object.values(possibleShiftCategories)],
};

const customSettings = ref({
  allowedShiftTypes: propsShiftTypeToList[props.mode],
  selectedShiftType: propsShiftTypeToList[props.mode][0].value,
  allowedShiftCategories: propsShiftCategoryToList[props.mode],
  selectedShiftCategory: propsShiftCategoryToList[props.mode][0].value,
});

const calendarRef = ref(null);

// Watch changes in settings and update events
watch(
  [
    () => customSettings.value.selectedShiftType,
    () => customSettings.value.selectedShiftCategory,
  ],
  (_) => {
    registerEventUpdate();
  },
);

const calendarComputed = () => {
  return calendarRef;
};

onMounted(() => {
  registerEventUpdate();
});

const registerEventUpdate = async () => {
  const calendar = await calendarRef.value.getApi();

  calendar.on("datesSet", (infos) => {
    updateEvents(
      DateTime.fromJSDate(infos.start),
      DateTime.fromJSDate(infos.end),
    );
  });

  await updateEvents(
    DateTime.fromJSDate(calendar.view.activeStart),
    DateTime.fromJSDate(calendar.view.activeEnd),
  );
};

const colors = ["#2E8B57", "#FF8C00", "#B22222"];

async function updateEvents(from, to) {
  const occurrences = await getShiftOccurrences(from, to, {
    shiftType: customSettings.value.selectedShiftType,
    shiftCategory: customSettings.value.selectedShiftCategory,
    admin: props.mode === "admin",
  });

  const events = [];

  for (const occurrence of occurrences) {
    const n_missing = occurrence.shift.shifts_slots - occurrence.n_assigned;
    const start = occurrence.start.toJSDate();
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
    if (props.mode === "admin" && !isPast) {
      if (occurrence.shift.shifts_category === "operativos") {
        if (occurrence.n_assigned > 0) {
          const assignedUser =
            occurrence.assignments[0].assignment.shifts_membership
              .memberships_user;
          title +=
            " [" + assignedUser.first_name + " " + assignedUser.last_name + "]";
        }
      }
      title +=
        " [" +
        occurrence.n_assigned +
        "/" +
        occurrence.shift.shifts_slots +
        "]";
    }

    events.push({
      title: title,
      start: occurrence.start.toJSDate(),
      end: occurrence.end.toJSDate(),
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
      v-model="customSettings"
      :calendar-ref="calendarComputed()"
    />
    <full-calendar ref="calendarRef" :options="calendarOptions" />
  </div>

  <template v-if="props.mode != 'admin'">
    <ShiftsAssignmentPostModal
      v-if="shiftActionModalisOpen && selectedShiftOccurence"
      v-model:is-open="shiftActionModalisOpen"
      :shift-occurence="selectedShiftOccurence"
      :shift-type="customSettings.selectedShiftType"
    />
  </template>
  <template v-else>
    <ShiftsAdminModal
      v-if="shiftActionModalisOpen && selectedShiftOccurence"
      v-model:is-open="shiftActionModalisOpen"
      :shift-occurence="selectedShiftOccurence"
      :shift-type="customSettings.selectedShiftType"
      @data-has-changed="registerEventUpdate"
    />
  </template>
</template>

<style scoped>
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
