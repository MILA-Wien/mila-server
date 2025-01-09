<script setup lang="ts">
import type { PropType } from "vue";

const props = defineProps({
  events: {
    type: Object as PropType<ShiftOccurrenceFrontend>,
    required: true,
  },
});

const { locale, t } = useI18n();
</script>

<template>
  <div>Hello world</div>
  <div class="flex flex-col gap-2">
    <div
      v-for="(occurrence, index) in events.occurrences"
      :key="index"
      class="bg-green-100 p-3"
    >
      <div>{{ occurrence.shift.shifts_name }}</div>
      <div>{{ occurrence.start }}</div>
      <div>{{ occurrence.end }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  Month: Monat
</i18n>
