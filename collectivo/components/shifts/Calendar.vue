<script setup lang="ts">
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import luxonPlugin from "@fullcalendar/luxon3";
import { DateTime } from "luxon";

const props = defineProps({
  mode: {
    type: String,
    default: null,
  },
});

const assignmentCreationModalOpen = ref(false);
const selectedShiftOccurence = ref(null);

// Dates are used without time, time always being set to UTC 00:00
const calendarOptions = ref({
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
  events: [],
  allDaySlot: false,
  displayEventTime: true,
  eventTimeFormat: {
    hour: "2-digit",
    minute: "2-digit",
    meridiem: false,
    hour12: false,
  },
  nowIndicator: true,
  eventClick: (info) => {
    selectedShiftOccurence.value = info.event.extendedProps.shiftOccurence;
    assignmentCreationModalOpen.value = true;
  },
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

const propsShiftTypeToList: { [key: string]: ShiftType[] } = {
  jumper: [possibleShiftTypes.jumper],
  admin: Object.values(possibleShiftTypes),
};

const customSettings = ref({
  allowedShiftTypes: propsShiftTypeToList[props.mode],
  selectedShiftType: propsShiftTypeToList[props.mode][0].value,
});

const calendarRef = ref(null);

watch(
  () => customSettings.value.selectedShiftType,
  (value) => {
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

async function updateEvents(from, to) {
  const occurrences = await getShiftOccurrences(from, to, {
    shiftType: customSettings.value.selectedShiftType,
    admin: props.mode === "admin",
  });

  const events = [];

  for (const occurrence of occurrences) {
    events.push({
      title:
        occurrence.shift.shifts_name +
        " - " +
        (occurrence.slotNumber - occurrence.openSlots.length) +
        "/" +
        occurrence.slotNumber,
      start: occurrence.start.toJSDate(), // TODO: Handle invalid date
      end: occurrence.end.toJSDate(),
      allDay: false,
      shiftOccurence: occurrence,
    });
  }

  calendarOptions.value.events = events;
}
</script>

<template>
  <div id="dashboard-calendar" class="calendar">
    <ShiftsCalendarHeader
      v-model="customSettings"
      :calendar-ref="calendarComputed()"
    />
    <full-calendar ref="calendarRef" :options="calendarOptions" />
  </div>

  <template v-if="props.mode != 'admin'">
    <ShiftsAssignmentPostModal
      v-if="assignmentCreationModalOpen && selectedShiftOccurence"
      v-model:is-open="assignmentCreationModalOpen"
      :shift-occurence="selectedShiftOccurence"
      :shift-type="customSettings.selectedShiftType"
    />
  </template>
  <template v-else>
    <ShiftsAdminModal
      v-if="assignmentCreationModalOpen && selectedShiftOccurence"
      v-model:is-open="assignmentCreationModalOpen"
      :shift-occurence="selectedShiftOccurence"
      :shift-type="customSettings.selectedShiftType"
    />
  </template>
</template>

<style scoped>
:deep(.fc-event) {
  cursor: pointer;
}
</style>
