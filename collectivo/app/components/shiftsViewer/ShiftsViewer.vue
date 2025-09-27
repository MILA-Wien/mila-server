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
const modalOccurrence = ref<ShiftOccurrence | null>(null);
function openModal(occ: ShiftOccurrence) {
  modalOccurrence.value = occ;
  modalIsOpen.value = true;
}

// Fetching events from API (occurrences and public holidays)
const render = ref(false);
const events = ref<Awaited<ReturnType<typeof getOccurrencesAdmin>> | null>(
  null,
);
const startDate = ref(new Date());
const endDate = ref(new Date());
async function loadEvents() {
  events.value = null;
  events.value = await getOccurrencesAdmin(
    startDate.value.toISOString(),
    endDate.value.toISOString(),
    props.admin,
  );
  render.value = true;
}

// View options
const viewOptions = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];
const selectedView = ref(viewOptions[2]);

const filterOptions = [
  { label: "All shifts", value: "all" },
  { label: "Open shifts", value: "unfilled" },
  { label: "Mit Buddy (BETA)", value: "withbuddy" },
];

const route = useRoute();
const router = useRouter();

const selectedFilter = ref(
  filterOptions.find((filter) => filter.value === props.filter) ||
    filterOptions[0],
);

// Categories
const categoriesLoaded = ref(false);
const categories = ref<ShiftsCategory[]>([
  {
    id: -1,
    name: "Alle Kategorien",
  },
  {
    id: 0,
    name: "Normal",
  },
]);

const selectedCategory = ref(categories.value[0]);
const allowedCategoryIds = ref<number[]>([]);

// Update URL when ref changes
watch(selectedCategory, (newVal) => {
  router.replace({
    query: {
      ...route.query,
      cat: newVal.id,
    },
  });
});

const user = useCurrentUser();

async function loadCategories() {
  if (props.admin) {
    await loadCategoriesAdmin();
  } else {
    await loadCategoriesUser();
  }
  categoriesLoaded.value = true;

  if (route.query.cat) {
    const catid = parseInt(route.query.cat as string);
    const cat = categories.value.find((c) => c.id === catid);
    if (cat) {
      selectedCategory.value = cat;
      return;
    } else {
      router.replace({
        query: {
          ...route.query,
          cat: undefined,
        },
      });
    }
  }
}

async function loadCategoriesAdmin() {
  const allcats = await useShiftsCategories().loadPromise;
  allowedCategoryIds.value = allcats.map((cat) => cat.id);
  categories.value.push(...allcats);
  categoriesLoaded.value = true;
}

async function loadCategoriesUser() {
  const allcats = await useShiftsCategories().loadPromise;
  const seen = new Set();
  for (const ca of user.value.membership?.shifts_categories_allowed || []) {
    const cat = allcats.find((c) => c.id === ca.shifts_categories_id);
    if (cat && !seen.has(cat.id)) {
      seen.add(cat.id);
      allowedCategoryIds.value.push(cat.id);
      categories.value.push(cat);
    }
  }
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

async function rerender() {
  render.value = false;
  await nextTick();
  render.value = true;
}

watch(selectedFilter, async () => {
  rerender();
});

watch(selectedCategory, async () => {
  rerender();
});

// Watch changes in locale (needs re-render)
const showCalendar = ref(true);
watch(locale, () => {
  showCalendar.value = false;
  showCalendar.value = true;
});

loadCategories();
setMonthDates();
loadEvents();
</script>

<template>
  <div
    v-if="categoriesLoaded"
    class="flex flex-wrap justify-between items-center gap-4"
  >
    <FormsFormGroup :label="t(selectedView.label)" class="flex-[1_0_0]">
      <div
        class="flex flex-row justify-between items-center h-[50px] border border-black"
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
    </FormsFormGroup>

    <FormsFormGroup :label="t('Display')" class="flex-1">
      <USelectMenu
        v-model="selectedView"
        :items="viewOptions"
        item-attribute="label"
        :search-input="false"
        class="whitespace-nowrap"
      >
        <template #default>{{ t(selectedView?.label) }}</template>
        <template #item-label="{ item }">
          {{ t(item.label) }}
        </template>
      </USelectMenu>
    </FormsFormGroup>

    <FormsFormGroup :label="t('Filter')" class="flex-1">
      <USelectMenu
        v-model="selectedFilter"
        :items="filterOptions"
        :search-input="false"
        option-attribute="label"
        class="whitespace-nowrap"
      >
        <template #default>{{ t(selectedFilter?.label) }}</template>
        <template #item-label="{ item }">
          {{ t(item.label) }}
        </template>
      </USelectMenu>
    </FormsFormGroup>

    <FormsFormGroup
      v-if="categories.length > 1"
      :label="t('Category')"
      class="flex-1"
    >
      <USelectMenu
        v-model="selectedCategory"
        :items="categories"
        :search-input="false"
        class="whitespace-nowrap"
      >
        <template #default>{{ t(selectedCategory.name) }}</template>
        <template #item-label="{ item }">
          {{ t(item.name) }}
        </template>
      </USelectMenu>
    </FormsFormGroup>
  </div>
  <div v-if="render && events != null" class="pt-10">
    <ShiftsViewerShiftsList
      v-if="selectedView.value === 'week' || selectedView.value === 'day'"
      :events="events"
      :admin="admin"
      :status="selectedFilter.value"
      :category="selectedCategory.id"
      :allowed-categories="allowedCategoryIds"
      @open-occurrence="openModal"
    />
    <ShiftsViewerShiftsCalendar
      v-else-if="selectedView.value === 'month' && showCalendar"
      :admin="admin"
      :events="events"
      :from-date="startDate"
      :to-date="endDate"
      :status="selectedFilter.value"
      :category="selectedCategory.id"
      :allowed-categories="allowedCategoryIds"
      @open-occurrence="openModal"
    />
  </div>
  <div v-else class="pt-10">
    <USkeleton class="h-24 w-full" />
  </div>

  <template v-if="props.admin">
    <ShiftsViewerModalAdmin
      v-if="modalIsOpen && modalOccurrence"
      v-model:is-open="modalIsOpen"
      :shift-occurence="modalOccurrence"
      @data-has-changed="loadEvents"
    />
  </template>
  <template v-else>
    <ShiftsViewerModalUser
      v-if="modalIsOpen && modalOccurrence"
      v-model:is-open="modalIsOpen"
      :shift-occurence="modalOccurrence"
      :shift-type="'jumper'"
      @reload="loadEvents"
    />
  </template>
</template>

<style lang="scss" scoped>
:deep(.fc-daygrid-event) {
  border-radius: 0;
}
:deep(.fc-event-main) {
  padding: 4px 0px 4px 5px;
}
</style>

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
  "Open shifts": "Freie Schichten"
</i18n>
