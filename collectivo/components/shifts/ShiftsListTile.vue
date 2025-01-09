<script setup lang="ts">
import type { PropType } from "vue";

const props = defineProps({
  occurrence: {
    type: Object as PropType<ShiftOccurrenceFrontend>,
    required: true,
  },
});
</script>

<template>
  <div class="bg-green-100 p-3">
    <div>{{ occurrence.shift.shifts_name }}</div>
    <div>{{ occurrence.start }}</div>
    <div>{{ occurrence.end }}</div>
  </div>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  Month: Monat
  Public holiday: Feiertag
</i18n>
