<script setup lang="ts">
import type { PropType } from "vue";

const props = defineProps({
  admin: {
    type: Boolean,
    default: false,
  },
  events: {
    type: Object as PropType<OccurrencesApiResponse>,
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
  allowedCategories: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
});

const emit = defineEmits(["openOccurrence"]);
const isEmpty = ref(true);
const { locale, t } = useI18n();

const filterOpts = {
  status: props.status,
  category: props.category,
  allowedCategories: props.allowedCategories,
  admin: props.admin,
};

interface Events {
  [key: string]: {
    date: Date;
    dateString: string;
    isPublicHoliday: boolean;
    occurrences: ShiftOccurrenceResponse[];
  };
}
const groups: Events = {};
props.events.occurrences.forEach((occurrence) => {
  const date = new Date(occurrence.start);
  const dateString = date.toLocaleDateString(locale.value);
  if (!groups[dateString]) {
    groups[dateString] = {
      date: date,
      dateString: dateString,
      isPublicHoliday: false,
      occurrences: [],
    };
  }

  if (!filterOccurrence(occurrence, filterOpts)) return;

  groups[dateString].occurrences.push(occurrence);
  isEmpty.value = false;
});

props.events.publicHolidays.forEach((holiday) => {
  const date = new Date(holiday.date);
  const dateString = date.toLocaleDateString(locale.value);
  if (groups[dateString]) {
    groups[dateString].isPublicHoliday = true;
  }
});

function emitOcc(occ: ShiftOccurrenceResponse) {
  emit("openOccurrence", occ);
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <template v-if="isEmpty">
      <div class="bg-gray-100 p-5">
        <p>{{ t("No shifts found within the selected timespan.") }}</p>
      </div>
    </template>
    <template v-for="group in groups" :key="group.dateString">
      <template v-if="group.occurrences.length > 0">
        <div>
          <h2>
            {{ group.date.toLocaleDateString(locale, { weekday: "long" }) }},
            {{
              group.date.toLocaleDateString(locale, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            }}
            <span v-if="group.isPublicHoliday"
              >({{ t("Public holiday") }})</span
            >
          </h2>

          <div class="flex flex-col gap-2">
            <div v-for="(occurrence, index) in group.occurrences" :key="index">
              <ShiftsViewerShiftsListTile
                :occurrence="occurrence"
                :admin="admin"
                @open-occurrence="emitOcc"
              />
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  Month: Monat
  Public holiday: Feiertag
  No shifts found within the selected timespan.: Es wurden keine Schichten innerhalb des ausgewählten Zeitraums gefunden.
</i18n>
