<script setup lang="ts">
const props = defineProps({
  admin: {
    type: Boolean,
    default: false,
  },
  filter: {
    type: String,
    default: "all",
  },
});

const { locale, t } = useI18n();

// Modal controls
const modalIsOpen = ref(false);
const modalOccurrence = ref<ShiftOccurrenceFrontend | null>(null);
function openModal(occ: ShiftOccurrenceFrontend) {
  modalOccurrence.value = occ;
  modalIsOpen.value = true;
}

// Fetching events from API (occurrences and public holidays)
const events = ref<ShiftOccurrenceApiResponse | null>(null);
const startDate = ref(new Date());
const endDate = ref(new Date());
async function loadEvents() {
  events.value = null;
  events.value = await $fetch("/api/shifts/occurrences", {
    query: {
      from: startDate.value.toISOString(),
      to: endDate.value.toISOString(),
      admin: props.admin,
    },
  });
}

// View options
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
  filterOptions.find((filter) => filter.value === props.filter) ||
    filterOptions[0],
);

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
const selectedDate = ref(
  new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z"),
);

function setMonthDates() {
  startDate.value = new Date(
    Date.UTC(
      selectedDate.value.getFullYear(),
      selectedDate.value.getMonth(),
      1,
      0,
      0,
      0,
    ),
  );

  endDate.value = new Date(
    Date.UTC(
      selectedDate.value.getFullYear(),
      selectedDate.value.getMonth() + 1,
      1,
      0,
      0,
      0,
    ),
  );
}

function changeMonth(directionPositive: boolean) {
  const newMonth = new Date(selectedDate.value);
  newMonth.setMonth(newMonth.getMonth() + (directionPositive ? 1 : -1));
  selectedDate.value = newMonth;
  setMonthDates();

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

function setDayDates() {
  startDate.value = new Date(selectedDate.value);
  endDate.value = new Date(selectedDate.value);
}

function changeDay(directionPositive: boolean) {
  const newDay = new Date(selectedDate.value);
  newDay.setDate(newDay.getDate() + (directionPositive ? 1 : -1));
  selectedDate.value = newDay;
  setDayDates();
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

watch(selectedView, () => {
  switch (selectedView.value.value) {
    case "month":
      setMonthDates();
      break;
    case "week":
      setWeekDates();
      break;
    case "day":
      setDayDates();
      break;
  }
  loadEvents();
});

// Watch changes in locale (needs re-render)
const showCalendar = ref(true);
watch(locale, () => {
  console.log("Locale changed");
  showCalendar.value = false;
  showCalendar.value = true;
});

loadCategories();
setWeekDates();
loadEvents();
</script>

<template>
  <div
    v-if="categoriesLoaded"
    class="flex flex-wrap justify-between items-center gap-4"
  >
    <UFormGroup :label="t(selectedView.label)" class="flex-[1_0_0]">
      <div
        class="flex flex-row justify-between items-center h-[50px] bg-blue-50"
      >
        <UButton
          size="sm"
          variant="ghost"
          color="gray"
          style="background-color: transparent !important"
          @click="changeDate(false)"
        >
          <UIcon name="i-heroicons-chevron-left-16-solid" class="text-2xl" />
        </UButton>
        <span class="p-0 m-0 whitespace-nowrap">
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

    <UFormGroup :label="t('Display')" class="flex-1">
      <USelectMenu
        v-model="selectedView"
        :options="viewOptions"
        option-attribute="label"
        class="whitespace-nowrap"
      >
        <template #label>{{ t(selectedView?.label) }}</template>
        <template #option="{ option }">
          {{ t(option.label) }}
        </template>
      </USelectMenu>
    </UFormGroup>

    <UFormGroup :label="t('Signup')" class="flex-1">
      <USelectMenu
        v-model="selectedFilter"
        :options="filterOptions"
        option-attribute="label"
        class="whitespace-nowrap"
      >
        <template #label>{{ t(selectedFilter?.label) }}</template>
        <template #option="{ option }">
          {{ t(option.label) }}
        </template>
      </USelectMenu>
    </UFormGroup>

    <UFormGroup
      v-if="categories.length > 1"
      :label="t('Category')"
      class="flex-1"
    >
      <USelectMenu
        v-model="selectedCategory"
        :options="categories"
        class="whitespace-nowrap"
      >
        <template #label>{{ t(selectedCategory.name) }}</template>
        <template #option="{ option }">
          {{ t(option.name) }}
        </template>
      </USelectMenu>
    </UFormGroup>
  </div>
  <div v-if="events != null" class="pt-10">
    <ShiftsList
      v-if="selectedView.value === 'week' || selectedView.value === 'day'"
      :events="events"
      :admin="admin"
      @open-occurrence="openModal"
    />
    <ShiftsCalendar
      v-else-if="selectedView.value === 'month' && showCalendar"
      :admin="admin"
      :events="events"
      :from-date="startDate"
      :to-date="endDate"
      @open-occurrence="openModal"
    />
  </div>
  <div v-else class="pt-10">
    <USkeleton class="h-24 w-full" />
  </div>

  <template v-if="props.admin">
    <ShiftsCalendarModalAdmin
      v-if="modalIsOpen && modalOccurrence"
      v-model:is-open="modalIsOpen"
      :shift-occurence="modalOccurrence"
      @data-has-changed="loadEvents"
    />
  </template>
  <template v-else>
    <ShiftsCalendarModalUser
      v-if="modalIsOpen && modalOccurrence"
      v-model:is-open="modalIsOpen"
      :shift-occurence="modalOccurrence"
      :shift-type="'jumper'"
      @reload="loadEvents"
    />
  </template>
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
  Signup: Anmeldung
  "All shifts": "Alle Schichten"
  "Open shifts": "Offene Schichten"
</i18n>
