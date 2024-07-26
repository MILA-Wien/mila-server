<script setup lang="ts">
import { DateTime } from "luxon";
import { parse } from "marked";
import { createItem } from "@directus/sdk";

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
const start = props.shiftOccurence.start;
// const startDate = start.toISO()?.split("T")[0];
const end = props.shiftOccurence.end;
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

  const payload: ShiftsAssignment = {
    shifts_membership: user.value.membership!.id,
    shifts_shift: shift.id!,
    shifts_from: shiftStartString,
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

      <p v-if="shiftType" class="font-bold text-lg my-5 leading-7">
        <span v-if="shiftType === 'jumper'">
          {{ t("One-time shift") }}
          <br />
          {{ start.toLocaleString(DateTime.DATE_MED) }} {{ t("from") }}
          {{ start.toLocaleString(DateTime.TIME_24_SIMPLE) }}
          {{ t("to") }}
          {{ end.toLocaleString(DateTime.TIME_24_SIMPLE) }}
        </span>
        <span v-else>
          {{ t("Regular shift") }}
          <br />
          {{ start.weekdayLong }} {{ t("from") }}
          {{ start.toLocaleString(DateTime.TIME_24_SIMPLE) }}
          {{ t("to") }}
          {{ end.toLocaleString(DateTime.TIME_24_SIMPLE) }}
          <br />
          {{ t("Repeating every") }}
          {{ frequency }} {{ isWeeks ? t("weeks") : t("days") }}
          <br />
          {{ t("Starting from") }}
          {{ start.toLocaleString(DateTime.DATE_MED) }}
        </span>
        <br />
        <span v-if="shift.shifts_location">
          {{ t("Location") }}:
          {{ shift.shifts_location }}
        </span>
      </p>

      <!-- Shift infos -->
      <p
        v-if="shift.shifts_description"
        class="mb-5"
        v-html="parse(shift.shifts_description)"
      />

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
