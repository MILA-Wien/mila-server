<script setup lang="ts">
import { createItem } from "@directus/sdk";

const isOpen = defineModel<boolean>();
const absenceFromDate = ref<Date | undefined>(undefined);
const absenceToDate = ref<Date | undefined>(undefined);
// const absenceIsHoliday = ref(false);

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

  if (absenceFromDate.value < new Date()) {
    showToast({
      type: "error",
      title: "Error",
      description: t("Absence must start in the future."),
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
  <UModal v-model="isOpen">
    <div v-if="success === true" class="p-10 flex flex-col gap-3">
      <h2>{{ t("Holiday request submitted") }}</h2>
      <p>{{ t("We will inform you when your request is accepted.") }}</p>
      <UButton class="w-full" @click="closeModal">
        {{ t("Close") }}
      </UButton>
    </div>
    <div v-else-if="success === false" class="p-10 flex flex-col gap-3">
      <h2>{{ t("Something went wrong") }}</h2>
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
      <UFormGroup :label="t('From')" class="my-5">
        <CollectivoFormDate
          v-model="absenceFromDate"
          :max-years-past="1"
          :max-years-future="1"
        />
      </UFormGroup>
      <UFormGroup :label="t('To')" class="my-5">
        <CollectivoFormDate
          v-model="absenceToDate"
          :max-years-past="1"
          :max-years-future="1"
        />
      </UFormGroup>

      <UButton
        class="w-full mt-4"
        size="lg"
        icon="i-heroicons-pencil-square"
        @click="postAbsence()"
      >
        {{ t("Request holiday") }}
      </UButton>
    </div>
  </UModal>
</template>

<i18n lang="yaml">
de:
  Holiday request submitted: "Urlaubsantrag abgesendet"
  We will inform you when your request is accepted.: "Wir melden uns, sobald Dein Antrag angenommen wurde."
  Something went wrong: "Etwas ist schief gelaufen"
  Please try again later or contact us.: "Bitte versuche es später erneut oder kontaktiere uns."
  From: "Von"
  To: "Bis"
  Close: "Schließen"
  Request holiday: "Urlaub beantragen"
  t:holiday: Während eines Urlaubes kannst Du nicht einkaufen gehen und musst auch keine Schichten übernehmen. Deine angemeldeten Schichten werden in dieser Zeit von anderen Mitgliedern übernommen.

en:
  t:holiday: During a holiday, you cannot go shopping and do not have to take on any shifts. Your registered shifts will be taken over by other members during this time.
</i18n>
