<script setup lang="ts">
import { DateTime } from "luxon";
import { parse } from "marked";
const { locale } = useI18n();

const props = defineProps({
  shiftOccurence: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["reload"]);
const isOpen = defineModel("isOpen", { required: true, type: Boolean });
const { t } = useI18n();
const user = useCurrentUser();
const occ = props.shiftOccurence;
const shift = props.shiftOccurence.shift;

const start = DateTime.fromISO(props.shiftOccurence.start, {
  locale: locale.value,
  zone: "utc",
});

const end = DateTime.fromISO(props.shiftOccurence.end, {
  locale: locale.value,
  zone: "utc",
});
const submitLoading = ref(false);
const isRegular = shift.shifts_is_regular;
const isPast = new Date(props.shiftOccurence.start) < new Date();

function checkAssignmentPossible() {
  if (props.shiftOccurence.selfAssigned) {
    return false;
  }
  if (isPast) {
    return false;
  }
  if (
    props.shiftOccurence.n_assigned >= props.shiftOccurence.shift.shifts_slots
  ) {
    return false;
  }
  return true;
}

const assignmentPossible = checkAssignmentPossible();

async function postAssignment(regular = false) {
  console.log("postAssignment");
  try {
    await postAssignmentInner(regular);

    showToast({
      type: "success",
      description: "Shift assignment successfull",
    });

    navigateTo("dashboard");
  } catch (e) {
    console.error(e);
    showToast({
      type: "error",
      description: "Shift assignment failed",
    });
    submitLoading.value = false;
  }
}

async function fetchOccurrences(from: DateTime, to: DateTime, shiftID: number) {
  return await $fetch("/api/shifts/occurrences", {
    query: {
      from: from.toISODate(),
      to: to.toISODate(),
      shiftID: shiftID,
    },
  });
}

async function postAssignmentInner(regular: boolean) {
  submitLoading.value = true;

  const shiftStartString = start.toISO()!;

  // Check if shift is already full (parallel signup)
  const res = await fetchOccurrences(start, end, shift.id!);
  const occurrences = res.occurrences;

  if (occurrences.length != 1) {
    throw new Error("No or multiple occurrences found");
  }
  const occ = occurrences[0];

  if (occ.n_assigned >= occ.shift.shifts_slots) {
    const m = "Somebody else has just signed up for this shift";
    showToast({
      type: "info",
      description: m,
    });
    emit("reload");
    submitLoading.value = false;
    throw new Error(m);
  }

  const payload: {
    shifts_membership: number;
    shifts_shift: number;
    shifts_from: string;
    shifts_is_regular: boolean;
    shifts_to?: string;
  } = {
    shifts_membership: user.value.membership!.id,
    shifts_shift: shift.id!,
    shifts_from: shiftStartString,
    shifts_is_regular: regular,
  };

  // One-time shifts have same start and end date
  // Regular shifts are either until freeUntil or forever
  if (!regular) {
    payload.shifts_to = shiftStartString;
  }

  await $fetch("/api/shifts/assignments", {
    method: "POST",
    body: payload,
  });
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="m-10">
        <h2>{{ shift.shifts_name }}</h2>

        <div class="flex flex-col gap-2 my-5 leading-7">
          <p class="font-bold">
            {{ start.toLocaleString(DateTime.DATE_MED) }} {{ t("from") }}
            {{ start.toLocaleString(DateTime.TIME_24_SIMPLE) }}
            {{ t("to") }}
            {{ end.toLocaleString(DateTime.TIME_24_SIMPLE) }}
          </p>
          <p v-if="isRegular">
            {{ t("Shift repeats every four weeks") }}
          </p>
          <p v-else>
            {{ t("One-time shift") }}
          </p>
          <ShiftsViewerAssignmentList :occurrence="occ" />
        </div>

        <!-- Shift infos -->
        <!-- eslint-disable vue/no-v-html -->
        <p
          v-if="shift.shifts_description"
          class="mb-5"
          v-html="parse(shift.shifts_description)"
        />
        <!-- eslint-enable -->

        <div v-if="assignmentPossible" class="flex flex-col gap-2">
          <UButton
            class="w-full"
            size="lg"
            color="green"
            icon="i-heroicons-pencil-square"
            :loading="submitLoading"
            @click="postAssignment()"
          >
            {{ t("Sign up one-time for") }}
            {{ shiftOccurence.start.split("T")[0] }}
          </UButton>
          <UButton
            v-if="isRegular"
            class="w-full"
            size="lg"
            icon="i-heroicons-arrow-path"
            :loading="submitLoading"
            @click="postAssignment(true)"
          >
            {{ t("Sign up regularly, every 4 weeks") }}
          </UButton>
        </div>
        <div v-else-if="shiftOccurence.selfAssigned">
          <UButton class="w-full" size="lg" color="gray" disabled>
            {{ t("Already signed up") }}
          </UButton>
        </div>
        <div v-else>
          <UButton class="w-full" size="lg" color="gray" disabled>
            {{ t("Assignment not possible") }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
de:
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
  Assignment not possible: "Anmeldung nicht möglich"
  Already signed up: "Bereits angemeldet"
  "Sign up one-time for": "Einmalig anmelden für"
  "Sign up regularly, every 4 weeks": "Regelmäßig anmelden, alle 4 Wochen"
  "Shift repeats every four weeks": "Schicht wiederholt sich alle vier Wochen"
</i18n>
