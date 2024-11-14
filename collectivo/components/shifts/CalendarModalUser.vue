<script setup lang="ts">
import { DateTime } from "luxon";
import { parse } from "marked";
import { createItem } from "@directus/sdk";
const { locale } = useI18n();

const props = defineProps({
  shiftOccurence: {
    type: Object as PropType<ShiftOccurrence>,
    required: true,
  },
  shiftType: {
    type: String,
    default: "regular",
  },
});

const isOpen = defineModel("isOpen", { required: true, type: Boolean });
const { t } = useI18n();
const directus = useDirectus();
const user = useCollectivoUser();
const shift = props.shiftOccurence.shift;
const start = DateTime.fromISO(props.shiftOccurence.start, {
  locale: locale.value,
});
const end = DateTime.fromISO(props.shiftOccurence.end, {
  locale: locale.value,
});
const submitLoading = ref(false);
const repeats = shift.shifts_repeats_every ?? 0;
const isWeeks = repeats % 7 === 0;
const frequency = isWeeks ? repeats / 7 : repeats;

async function postAssignment() {
  try {
    await postAssignmentInner();

    showToast({
      type: "success",
      description: "Shift assignment successfull",
    });

    navigateTo("dashboard");
  } catch (e) {
    showToast({
      type: "error",
      description: "Shift assignment failed",
    });
  }
}

async function postAssignmentInner() {
  submitLoading.value = true;

  const shiftStartString = start.toISO()!;

  const payload: Partial<ShiftsAssignment> = {
    shifts_membership: user.value.membership!.id,
    shifts_shift: shift.id!,
    shifts_from: shiftStartString,
    shifts_is_regular: false,
    shifts_is_coordination: false,
  };

  // One-time shifts have same start and end date
  // Regular shifts are either until freeUntil or forever
  if (props.shiftType === "jumper") {
    payload.shifts_to = shiftStartString;
  } else {
    throw new Error("Regular shifts are not supported yet");
  }

  await directus.request(createItem("shifts_assignments", payload));
}
</script>

<template>
  <UModal v-model="isOpen">
    <div class="m-10">
      <h2>{{ shift.shifts_name }}</h2>

      <div v-if="shiftType" class="shift-infos">
        <div v-if="shiftType === 'jumper'">
          <p>{{ t("One-time shift") }}</p>
          <p>
            {{ start.toLocaleString(DateTime.DATE_MED) }} {{ t("from") }}
            {{ start.toLocaleString(DateTime.TIME_24_SIMPLE) }}
            {{ t("to") }}
            {{ end.toLocaleString(DateTime.TIME_24_SIMPLE) }}
          </p>
        </div>
        <div v-else>
          <p>{{ t("Regular shift") }}</p>
          <p>
            {{ start.weekdayLong }} {{ t("from") }}
            {{ start.toLocaleString(DateTime.TIME_24_SIMPLE) }}
            {{ t("to") }}
            {{ end.toLocaleString(DateTime.TIME_24_SIMPLE) }}
          </p>
          <p>
            {{ t("Repeating every") }}
            {{ frequency }} {{ isWeeks ? t("weeks") : t("days") }}
          </p>
          <p>
            {{ t("Starting from") }}
            {{ start.toLocaleString(DateTime.DATE_MED) }}
          </p>
        </div>
        <p v-if="shift.shifts_category && shift.shifts_category !== 'normal'">
          {{ t("Category") }}: {{ t("shifts:" + shift.shifts_category) }}
        </p>
      </div>

      <!-- Shift infos -->
      <!-- eslint-disable vue/no-v-html -->
      <p
        v-if="shift.shifts_description"
        class="mb-5"
        v-html="parse(shift.shifts_description)"
      />
      <!-- eslint-enable -->

      <UButton
        class="w-full"
        size="lg"
        icon="i-heroicons-pencil-square"
        :loading="submitLoading"
        @click="postAssignment()"
      >
        {{ t("Sign up") }}
      </UButton>
    </div>
  </UModal>
</template>

<style lang="scss" scoped>
.shift-infos {
  @apply flex flex-col gap-2 text-lg my-5 leading-7;
}
.shift-infos p {
  @apply font-bold;
}
</style>

<i18n lang="yaml">
de:
  "Sign up": "Verbindlich anmelden"
  from: "von"
  to: "bis"
  Repeating every: "Wiederholt sich alle"
  days: "Tage"
  weeks: "Wochen"
  until: "bis"
  "Starting from": "Beginnend am"
  Regular shift: "Regelmäßige Schicht"
  One-time shift: "Einmalige Schicht"
  Location: "Ort"
</i18n>
