<script setup lang="ts">
import { createItem } from "@directus/sdk";

const MIN_DAYS_BEFORE_HOLIDAY = 2;
const isOpen = defineModel<boolean>();
const absenceFromDate = ref<Date | undefined>(undefined);
const absenceToDate = ref<Date | undefined>(undefined);
const success: Ref<null | boolean> = ref(null);
const { t } = useI18n();
const directus = useDirectus();
const emit = defineEmits(["reload"]);
const props = defineProps<{
  mshipID: number;
}>();

async function postAbsence() {
  try {
    await postAbsenceInner();
  } catch (error) {
    console.error(error);
    success.value = false;
  }
}

async function postAbsenceInner() {
  if (!absenceFromDate.value || !absenceToDate.value) {
    showToast({
      type: "error",
      title: "Error",
      description: t("Please fill out every field."),
    });
    return;
  }

  const minStartDate = new Date();
  minStartDate.setDate(minStartDate.getDate() + MIN_DAYS_BEFORE_HOLIDAY);

  if (absenceFromDate.value < minStartDate) {
    showToast({
      type: "error",
      title: "Error",
      description: t(
        `Absence must start at least ${MIN_DAYS_BEFORE_HOLIDAY} days from today.`,
      ),
    });
    return;
  }

  if (absenceFromDate.value > absenceToDate.value) {
    showToast({
      type: "error",
      title: "Error",
      description: t("Absence must end after it starts."),
    });
    return;
  }

  const payload = {
    shifts_membership: props.mshipID,
    shifts_from: absenceFromDate.value?.toISOString(),
    shifts_to: absenceToDate.value?.toISOString(),
    shifts_is_holiday: true,
    shifts_is_for_all_assignments: true,
  } as Partial<ShiftsAbsence>;

  await directus.request(createItem("shifts_absences", payload));

  success.value = true;
  absenceFromDate.value = undefined;
  absenceToDate.value = undefined;
}

function closeModal() {
  isOpen.value = false;
  success.value = null;
  emit("reload");
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div v-if="success === true" class="p-10 flex flex-col">
        <h2>{{ t("Request holiday") }}</h2>
        <div class="flex flex-wrap items-center gap-3 pb-3">
          <UIcon
            name="i-heroicons-check-circle-16-solid"
            class="text-green-500 w-16 h-16"
          />
          <p>{{ t("Holiday submitted successfully.") }}</p>
        </div>
        <UButton class="w-full" @click="closeModal">
          {{ t("Close") }}
        </UButton>
      </div>
      <div v-else-if="success === false" class="p-10 flex flex-col gap-3">
        <h2 class="mb-5">{{ t("Request holiday") }}</h2>
        <p>{{ t("Something went wrong") }}</p>
        <p>{{ t("Please try again later or contact us.") }}</p>
        <UButton class="w-full" @click="closeModal">
          {{ t("Close") }}
        </UButton>
      </div>
      <div v-else class="p-10">
        <h2 class="mb-5">{{ t("Request holiday") }}</h2>
        <p>
          {{ t("t:holiday") }}
        </p>
        <FormsFormGroup :label="t('From')" class="my-5">
          <FormsDate
            v-model="absenceFromDate"
            :max-years-past="1"
            :max-years-future="1"
          />
        </FormsFormGroup>
        <FormsFormGroup :label="t('To')" class="my-5">
          <FormsDate
            v-model="absenceToDate"
            :max-years-past="1"
            :max-years-future="1"
          />
        </FormsFormGroup>

        <UButton
          class="w-full mt-4"
          size="lg"
          icon="i-heroicons-pencil-square"
          @click="postAbsence()"
        >
          {{ t("Request holiday") }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
de:
  "Holiday submitted successfully.": "Urlaub erfolgreich eingereicht."
</i18n>
