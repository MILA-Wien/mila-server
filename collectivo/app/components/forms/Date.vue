<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: Date,
    default: null,
  },
  maxYearsFuture: {
    type: Number,
    default: 0,
  },
  maxYearsPast: {
    type: Number,
    default: 150,
  },
});

const { t } = useI18n();
const emit = defineEmits(["update:modelValue"]);

const date: Ref<Date | undefined> = ref();

const day = ref();
const month = ref();
const year = ref();

const days = Array.from({ length: 31 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const years = Array.from(
  { length: props.maxYearsPast + props.maxYearsFuture },
  (_, i) => (new Date().getFullYear() + props.maxYearsFuture - i).toString(),
);

if (props.modelValue) {
  date.value = new Date(props.modelValue);
  day.value = date.value.getUTCDate().toString().padStart(2, "0");
  month.value = months[date.value.getUTCMonth()];
  year.value = date.value.getUTCFullYear().toString();
}

watch(
  () => props.modelValue,
  (newValue) => {
    console.log("Updating date from modelValue", newValue);
    if (
      !date.value ||
      newValue.getUTCSeconds() !== date.value.getUTCSeconds()
    ) {
      if (newValue) {
        const d = new Date(newValue);
        day.value = d.getUTCDate().toString().padStart(2, "0");
        month.value = months[d.getUTCMonth()];
        year.value = d.getUTCFullYear().toString();
        date.value = d;
      } else {
        day.value = undefined;
        month.value = undefined;
        year.value = undefined;
        date.value = undefined;
      }
    }
  },
);

watch(
  () => date.value,
  (value) => {
    emit("update:modelValue", value);
  },
);

watch([day, month, year], ([day, month, year]) => {
  if (day && month && year)
    date.value = new Date(`${year}/${months.indexOf(month) + 1}/${day} UTC`);
});
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <div class="w-third-with-gap min-w-24">
      <USelectMenu
        v-model="day"
        :items="days"
        :placeholder="t('Day')"
        :searchInput="false"
      />
    </div>
    <div class="w-third-with-gap min-w-24">
      <USelectMenu
        v-model="month"
        :items="months"
        :placeholder="t('Month')"
        :searchInput="false"
      >
        <template #default> {{ t(month ?? "Month") }} </template>
        <template #item="{ item }">
          {{ t(item) }}
        </template>
      </USelectMenu>
    </div>
    <div class="w-1/3 min-w-24">
      <USelectMenu
        v-model="year"
        :items="years"
        :placeholder="t('Year')"
        :searchInput="false"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.w-third-with-gap {
  width: calc(33.333333% - 0.5rem);
}
</style>

<i18n lang="json">
{
  "de": {
    "Day": "Tag",
    "Month": "Monat",
    "Year": "Jahr",
    "January": "Jänner",
    "February": "Februar",
    "March": "März",
    "April": "April",
    "May": "Mai",
    "June": "Juni",
    "July": "Juli",
    "August": "August",
    "September": "September",
    "October": "Oktober",
    "November": "November",
    "December": "Dezember"
  }
}
</i18n>
