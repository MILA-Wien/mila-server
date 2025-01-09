<script setup lang="ts">
const props = defineProps({
  admin: {
    type: Boolean,
    default: false,
  },
  filters: {
    type: String,
    default: "all",
  },
});

const { locale, t } = useI18n();

const viewOptions = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];
const selectedView = ref(viewOptions[1]);

const filterOptions = [
  { label: "All shifts", value: "all" },
  { label: "Open shifts", value: "unfilled" },
];
const selectedFilter = ref(
  filterOptions.find((filter) => filter.value === props.filters) ||
    filterOptions[0],
);

const selectedDate = ref(
  new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z"),
);

async function fetchOccurrences(
  from: Date,
  to: Date,
): Promise<ShiftOccurrenceFrontend> {
  return await $fetch("/api/shifts/occurrences", {
    query: {
      from: from.toISOString(),
      to: to.toISOString(),
      admin: props.admin,
    },
  });
}

const events = ref<ShiftOccurrenceFrontend | null>(null);
const startDate = ref(new Date());
const endDate = ref(new Date());

async function loadEvents() {
  events.value = null;
  events.value = await fetchOccurrences(startDate.value, endDate.value);
}

// Categories
const categoriesLoaded = ref(false);
const categories = ref<ShiftsCategory[]>([
  {
    id: -1,
    name: "Alle",
  },
  {
    id: 0,
    name: "Normal",
  },
]);
const selectedCategory = ref(categories.value[0]);
const user = useCurrentUser();

async function loadCategories() {
  if (props.admin) {
    categories.value.push(...(await useShiftsCategories().loadPromise));
    categoriesLoaded.value = true;
    return;
  }

  const cats = await useShiftsCategories().loadPromise;
  for (const ca of user.value.membership?.shifts_categories_allowed || []) {
    const cat = cats.find((c) => c.id === ca.shifts_categories_id);
    if (cat) categories.value.push(cat);
  }
  categoriesLoaded.value = true;
}

// Date navigation

function changeMonth(directionPositive: boolean) {
  const newMonth = new Date(selectedDate.value);
  newMonth.setMonth(newMonth.getMonth() + (directionPositive ? 1 : -1));
  selectedDate.value = newMonth;

  startDate.value = new Date(
    selectedDate.value.getFullYear(),
    selectedDate.value.getMonth(),
    1,
  );

  endDate.value = new Date(
    selectedDate.value.getFullYear(),
    selectedDate.value.getMonth() + 1,
    0,
  );

  loadEvents();
}

function setWeekDates() {
  const startDate_ = new Date(selectedDate.value);
  const day = startDate_.getDay();
  const diff = startDate_.getDate() - day + (day === 0 ? -6 : 1);
  startDate.value = new Date(startDate_.setDate(diff));

  const endDate_ = new Date(startDate.value);
  endDate_.setDate(endDate_.getDate() + 6);
  endDate.value = endDate_;
}

function changeWeek(directionPositive: boolean) {
  const newWeek = new Date(selectedDate.value);
  newWeek.setDate(newWeek.getDate() + (directionPositive ? 7 : -7));
  selectedDate.value = newWeek;

  setWeekDates();
  loadEvents();
}

function changeDay(directionPositive: boolean) {
  const newDay = new Date(selectedDate.value);
  newDay.setDate(newDay.getDate() + (directionPositive ? 1 : -1));
  selectedDate.value = newDay;
  startDate.value = new Date(selectedDate.value);
  endDate.value = new Date(selectedDate.value);
  loadEvents();
}

function changeDate(directionPositive: boolean) {
  switch (selectedView.value.value) {
    case "month":
      return changeMonth(directionPositive);
    case "week":
      return changeWeek(directionPositive);
    case "day":
      return changeDay(directionPositive);
  }
}

function getMonthString() {
  return selectedDate.value.toLocaleString(locale.value, {
    month: "long",
    year: "numeric",
  });
}

function getWeekString() {
  return (
    startDate.value.toLocaleDateString(locale.value, {
      month: "short",
      day: "numeric",
    }) +
    " - " +
    endDate.value.toLocaleDateString(locale.value, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );
}

function getDayString() {
  return selectedDate.value.toLocaleDateString(locale.value, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDateString() {
  switch (selectedView.value.value) {
    case "month":
      return getMonthString();
    case "week":
      return getWeekString();
    case "day":
      return getDayString();
  }
}

loadCategories();
setWeekDates();
loadEvents();
</script>

<template>
  <div v-if="categoriesLoaded" class="flex flex-wrap items-center gap-4">
    <UFormGroup :label="t(selectedView.label)">
      <div class="flex flex-row items-center h-[50px] bg-blue-50">
        <UButton
          size="sm"
          variant="ghost"
          color="gray"
          style="background-color: transparent !important"
          @click="changeDate(false)"
        >
          <UIcon name="i-heroicons-chevron-left-16-solid" class="text-2xl" />
        </UButton>
        <span class="p-0 m-0">
          {{ getDateString() }}
        </span>
        <UButton
          size="sm"
          variant="ghost"
          color="gray"
          style="background-color: transparent !important"
          @click="changeDate(true)"
        >
          <UIcon name="i-heroicons-chevron-right-16-solid" class="text-2xl" />
        </UButton>
      </div>
    </UFormGroup>

    <div class="flex flex-wrap gap-4">
      <UFormGroup v-if="categories.length > 1" :label="t('Category')">
        <USelectMenu
          v-model="selectedCategory"
          :options="categories"
          class="w-36"
        >
          <template #label>{{ t(selectedCategory.name) }}</template>
          <template #option="{ option }">
            {{ t(option.name) }}
          </template>
        </USelectMenu>
      </UFormGroup>
      <UFormGroup :label="t('Display')">
        <USelectMenu
          v-model="selectedView"
          :options="viewOptions"
          option-attribute="label"
          class="min-w-36"
        >
          <template #label>{{ t(selectedView?.label) }}</template>
          <template #option="{ option }">
            {{ t(option.label) }}
          </template>
        </USelectMenu>
      </UFormGroup>
      <UFormGroup :label="t('Filter')">
        <USelectMenu
          v-model="selectedFilter"
          :options="filterOptions"
          option-attribute="label"
          class="min-w-36"
        >
          <template #label>{{ t(selectedFilter?.label) }}</template>
          <template #option="{ option }">
            {{ t(option.label) }}
          </template>
        </USelectMenu>
      </UFormGroup>
    </div>
  </div>
  <div v-if="events != null" class="pt-10">
    <ShiftsList
      v-if="selectedView.value === 'week' || selectedView.value === 'day'"
      :events="events"
    />
    <div v-else-if="selectedView.value === 'month'">
      CALENDAR
      <!-- <ShiftsCalendar v-if="events" :events="events" /> -->
    </div>
  </div>
  <div v-else class="pt-10">
    <USkeleton class="h-24 w-full" />
  </div>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  Month: Monat
  Week: Woche
  Day: Tag
  List: Liste
  Calendar: Kalender
  Regular: Regelmäßig
  One-time: Einmalig
  Display: Anzeige
  Filters: Filter
  "All shifts": "Alle Schichten"
  "Open shifts": "Offene Schichten"
</i18n>
