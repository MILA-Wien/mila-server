<script setup lang="ts">
import type { PropType } from "vue";

const props = defineProps({
  admin: {
    type: Boolean,
    default: false,
  },
  events: {
    type: Object as PropType<ShiftOccurrenceApiResponse>,
    required: true,
  },
});

const emit = defineEmits(["openOccurrence"]);

const { locale, t } = useI18n();

interface Events {
  [key: string]: {
    date: Date;
    dateString: string;
    isPublicHoliday: boolean;
    occurrences: ShiftOccurrenceFrontend[];
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
  groups[dateString].occurrences.push(occurrence);
});

// TODO This is correct, have to fix in index.d.ts
props.events.publicHolidays.forEach((holiday) => {
  const date = new Date(holiday.date);
  const dateString = date.toLocaleDateString(locale.value);
  if (groups[dateString]) {
    groups[dateString].isPublicHoliday = true;
  }
});

function emitOcc(occ: ShiftOccurrenceFrontend) {
  emit("openOccurrence", occ);
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div v-for="group in groups" :key="group.dateString">
      <h2>
        {{ group.dateString }}
        <span v-if="group.isPublicHoliday">({{ t("Public holiday") }})</span>
      </h2>

      <div class="flex flex-col gap-2">
        <div v-for="(occurrence, index) in group.occurrences" :key="index">
          <ShiftsListTile
            :occurrence="occurrence"
            :admin="admin"
            @open-occurrence="emitOcc"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  Month: Monat
  Public holiday: Feiertag
</i18n>
