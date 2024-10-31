<script setup lang="ts">
import type { CalendarApi } from "@fullcalendar/core";

const props = defineProps({
  calendarApi: {
    type: Object as PropType<CalendarApi>,
    required: true,
  },
});

const { t } = useI18n();
const calConfig = defineModel<ShiftsCalendarConfig>({ required: true });
const shiftTypes = calConfig.value.allowedShiftTypes;
const shiftCategories = calConfig.value.allowedShiftCategories;
const displayedDate = ref();

onMounted(async () => {
  // const calendar = await props.calendarRef.value.getApi;
  // calendarApi.value = calendar();
  setView("dayGridMonth");
});

const calendarApi = props.calendarApi;

// Get shift type with value from props
const selectedShiftType = ref(
  shiftTypes.find((type) => type.value === calConfig.value.selectedShiftType),
);

const selectedShiftCategory = ref(
  shiftCategories.find(
    (type) => type.value === calConfig.value.selectedShiftCategory,
  ),
);

const prevHandler = () => {
  calendarApi.prev();
  displayedDate.value = calendarApi.view.title;
};

const nextHandler = () => {
  calendarApi.next();
  displayedDate.value = calendarApi.view.title;
};

const views = [
  {
    label: "Month",
    icon: "i-heroicons-calendar",
    view: "dayGridMonth",
  },
  {
    label: "Week",
    icon: "i-heroicons-view-columns",
    view: "timeGridWeek",
  },
  {
    label: "Day",
    icon: "i-heroicons-queue-list",
    view: "timeGridDay",
  },
];

const selectedView = ref(views[0]);

function setView(view: string) {
  calendarApi.changeView(view);
  displayedDate.value = calendarApi.view.title;
}

watch(selectedView, (value) => {
  setView(value.view);
});

watch(selectedShiftType, (value) => {
  calConfig.value.selectedShiftType = value.value;
});

watch(selectedShiftCategory, (value) => {
  calConfig.value.selectedShiftCategory = value.value;
});
</script>

<template>
  <div class="calendar-header">
    <div class="calendar-header__left">
      <h2 class="calendar-header__left__title">
        {{ displayedDate }}
      </h2>
      <div class="calendar-header__left__buttons">
        <UButton
          color="gray"
          variant="solid"
          :padded="false"
          @click="prevHandler"
        >
          <UIcon name="i-heroicons-chevron-left-16-solid" class="text-[22px]" />
        </UButton>
        <UButton
          color="gray"
          variant="solid"
          :padded="false"
          @click="nextHandler"
        >
          <UIcon
            name="i-heroicons-chevron-right-16-solid"
            class="text-[22px]"
          />
        </UButton>
      </div>
    </div>
    <div class="calendar-header__right">
      <UFormGroup v-if="shiftCategories.length > 1" :label="t('Category')">
        <USelectMenu
          v-model="selectedShiftCategory"
          :options="shiftCategories"
          class="w-36"
        >
          <template #label>{{ t(selectedShiftCategory.label) }}</template>
          <template #option="{ option }">
            {{ t(option.label) }}
          </template>
        </USelectMenu>
      </UFormGroup>
      <UFormGroup v-if="shiftTypes.length > 1" :label="t('Shift type')">
        <USelectMenu
          v-model="selectedShiftType"
          :options="shiftTypes"
          class="w-36"
        >
          <template #label>{{ t(selectedShiftType.label) }}</template>
          <template #option="{ option }">
            {{ t(option.label) }}
          </template>
        </USelectMenu>
      </UFormGroup>
      <UFormGroup :label="t('Display')">
        <USelectMenu
          v-model="selectedView"
          :options="views"
          option-attribute="label"
          class="w-36"
        >
          <template #label>{{ t(selectedView.label) }}</template>
          <template #option="{ option }">
            {{ t(option.label) }}
          </template>
        </USelectMenu>
      </UFormGroup>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.calendar-header {
  @apply flex flex-wrap items-start justify-between mb-6 gap-4;
  &__left {
    @apply flex flex-col items-start grow gap-2 justify-between lg:justify-start;
    &__title {
      @apply font-semibold text-2xl;
    }

    &__buttons {
      @apply flex items-center gap-2.5;
      button {
        @apply h-auto rounded-lg p-1;
      }
    }
  }

  &__right {
    @apply flex flex-wrap items-center gap-5;
    &__btn {
      @apply h-auto py-2 pl-4 pr-2.5 rounded-[10px] gap-0;
    }
  }
}
</style>

<i18n lang="yaml">
de:
  Month: Monat
  Week: Woche
  Day: Tag
  Regular: Regelmäßig
  One-time: Einmalig
  Shift type: Schichttyp
  Display: Anzeige
  "Registration regular": "Anmeldung Festschicht"
  "Registration one-time": "Anmeldung Einmalig"
  "Unfilled shifts": "Ungefüllte Schichten"
  "All shifts": "Alle Schichten"
</i18n>
