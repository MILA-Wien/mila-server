<script setup lang="ts">
import { DateTime } from "luxon";
import { parse } from "marked";
import { createItem, readItems } from "@directus/sdk";

interface SlotContainer {
  slot: ShiftsSlot;
  freeUntil: DateTime | null;
  id: number;
  occurences: Date[];
}

const props = defineProps({
  shiftOccurence: {
    type: Object as PropType<ShiftOccurrence>,
    required: true,
  },
});

const isOpen = defineModel("isOpen", { required: true, type: Boolean });
const { t } = useI18n();
const directus = useDirectus();
const user = useCollectivoUser();
const shift = props.shiftOccurence.shift;
const start = props.shiftOccurence.start;
const startDate = start.toISO()?.split("T")[0];
const end = props.shiftOccurence.end;
const submitLoading = ref(false);
const repeats = shift.shifts_repeats_every ?? 0;
const isWeeks = repeats % 7 === 0;
const frequency = isWeeks ? repeats / 7 : repeats;
const slots = ref<SlotContainer[]>([]);
const subModalIsOpen = ref(false);

async function getOpenSlots() {
  const openSlots = props.shiftOccurence.openSlots;
  return (await directus.request(
    readItems("shifts_slots", {
      filter: { id: { _in: openSlots } },
    }),
  )) as ShiftsSlot[];
}

onMounted(async () => {
  const openSlots = await getOpenSlots();

  for (const slot of openSlots) {
    const nearestFutureAssignment = (
      await directus.request(
        readItems("shifts_assignments", {
          filter: {
            shifts_membership: user.value.membership!.id,
            shifts_slot: { _eq: slot.id },
            shifts_from: { _gte: startDate },
          },
          sort: "-shifts_from",
          limit: 1,
        }),
      )
    )[0] as ShiftsAssignment;

    const freeUntil = nearestFutureAssignment
      ? DateTime.fromISO(
          nearestFutureAssignment.shifts_from + "T00:00:00.000Z",
        ).minus({
          days: 1,
        })
      : null;

    const occurences = props.shiftOccurence.shiftRule.between(
      start.startOf("day").toJSDate(),
      freeUntil ? freeUntil.toJSDate() : start.startOf("day").toJSDate(),
      true,
    );

    slots.value.push({
      id: slot.id,
      slot,
      freeUntil: freeUntil,
      occurences: occurences,
    });
  }
});

async function postAssignment(slotContainer: SlotContainer) {
  try {
    await postAssignmentInner(slotContainer);

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

const logs = ref<ShiftsLog[]>([]);

async function getLogs() {
  logs.value = await directus.request(
    readItems("shifts_logs", {
      filter: {
        shifts_shift: { _eq: shift.id },
        shifts_date: { _eq: startDate },
      },
      fields: [
        "id",
        "shifts_type",
        "shifts_note",
        "shifts_score",
        "shifts_membership.id",
        "shifts_membership.memberships_user.first_name",
        "shifts_membership.memberships_user.last_name",
        "shifts_membership.memberships_user.email",
      ],
    }),
  );
}

getLogs();

async function postAssignmentInner(slotContainer: SlotContainer) {
  submitLoading.value = true;

  const shiftStartString = start.toISO()!;

  const payload: ShiftsAssignment = {
    shifts_membership: user.value.membership!.id,
    shifts_slot: slotContainer.id,
    shifts_from: shiftStartString,
  };

  // One-time shifts have same start and end date
  // Regular shifts are either until freeUntil or forever
  // if (props.shiftType === "jumper") {
  //   payload.shifts_to = shiftStartString;
  // } else if (slotContainer.freeUntil) {
  //   payload.shifts_to = slotContainer.freeUntil.toISO()!;
  // }

  // await directus.request(createItem("shifts_assignments", payload));
}

function getUserString(mship: any) {
  const user = mship.memberships_user;
  return `M${mship.id} ${user.first_name} ${user.last_name}`;
}
</script>

<template>
  <UModal v-model="isOpen">
    <div class="m-10">
      <div class="flex items-center justify-between">
        <h2>{{ shift.shifts_name }}</h2>

        <a
          :href="`http://localhost:8055/admin/content/shifts_shift/${shift.id}`"
          target="blank"
          class="flex flex-row items-center align-middle text-xs gap-1"
        >
          <span class="text-xs">Shift {{ shift.id }}</span>
          <UIcon name="i-heroicons-arrow-top-right-on-square-16-solid" />
        </a>
      </div>

      <p class="font-bold text-lg my-5 leading-7">
        {{ t("ID") }}:
        {{ shift.id }}

        <br />

        {{ t("Date") }}:
        {{ start.toLocaleString(DateTime.DATE_MED) }}

        <br />

        {{ t("Time") }}:
        {{ start.toLocaleString(DateTime.TIME_24_SIMPLE) }}
        {{ t("to") }}
        {{ end.toLocaleString(DateTime.TIME_24_SIMPLE) }}

        <br />
        <span v-if="frequency">
          {{ t("Regular shift") }}
          ({{ frequency }} {{ isWeeks ? t("weeks") : t("days") }})
        </span>
        <span v-else>
          {{ t("One-time shift") }}
        </span>

        <!-- <span v-if="chosenSlot && chosenSlot.freeUntil">
          {{ t("until") }}
          {{ chosenSlot.freeUntil.toLocaleString(DateTime.DATE_MED) }}
        </span> -->
      </p>

      <!-- Shift infos -->
      <p
        v-if="shift.shifts_description"
        class="mb-5"
        v-html="parse(shift.shifts_description)"
      />

      <!-- Shift slots -->
      <h2>{{ t("Slots") }}</h2>

      <div class="flex flex-col gap-2 my-2">
        <ShiftsObjectBox
          v-for="slot of props.shiftOccurence.slots"
          :id="slot.id"
          :key="slot.id"
          label="Slot"
          collection="shifts_slots"
        >
          <template #header>{{ slot.slot.shifts_name }}</template>

          <ShiftsObjectBox
            v-for="assignment of slot.assignments"
            :id="assignment.assignment.id"
            :key="assignment.assignment.id"
            label="Assignment"
            collection="shifts_assignments"
          >
            <template #header>{{
              getUserString(assignment.assignment.shifts_membership)
            }}</template>
            {{ assignment.assignment.shifts_from }} to
            {{ assignment.assignment.shifts_to || "indefinite" }}

            <div class="flex flex-wrap gap-2">
              <UButton label="Remove assignment" />
            </div>
          </ShiftsObjectBox>

          <UButton
            v-if="slot.assignments.length == 0"
            label="Create assignment"
          />
        </ShiftsObjectBox>
      </div>

      <!-- <div
          v-for="assignment of slot.assignments"
          :key="assignment.assignment.id"
          class="p-2 border-2 border-solid"
        >
          <p class="font-bold">
            Anmeldung from
            {{ assignment.assignment.shifts_from }} to
            {{ assignment.assignment.shifts_to || "indefinite" }}
            (ID {{ assignment.assignment.id }})
          </p>
          <p>{{ getUserString(assignment.assignment.shifts_membership) }}</p>
          <div class="flex flex-wrap gap-2">
            <UButton label="Remove assignment" />
          </div>
        </div> -->

      <!-- </div> -->

      <!-- Logs -->
      <h2>{{ t("Logs") }}</h2>
      <div v-for="log of logs" :key="log.id">
        <!-- class="border-2 border-solid p-2 flex flex-row" -->
        <!-- <div class="grow">
          <p>Log ID: {{ log.id }}</p>
          <p>Type: {{ log.shifts_type }}</p>
          <p v-if="log.shifts_note">Note: {{ log.shifts_note }}</p>
          <p>Impact: {{ log.shifts_score }}</p>
          <p>Member: {{ getUserString(log.shifts_membership) }}</p>
        </div>
        <div class="">
          <a
            :href="`http://localhost:8055/admin/content/shifts_logs/${log.id}`"
            target="blank"
          >
            <UIcon name="i-heroicons-arrow-top-right-on-square-16-solid" />
          </a>
        </div> -->
        <ShiftsObjectBox :id="log.id!" label="Log" collection="shifts_logs">
          <template #header>{{ t(log.shifts_type) }}</template>
          <p>{{ getUserString(log.shifts_membership) }}</p>
          <p v-if="log.shifts_note">Notes: {{ log.shifts_note }}</p>
        </ShiftsObjectBox>
      </div>

      <!-- <UButton label="Open" @click="subModalIsOpen = true" />

      <UModal v-model="subModalIsOpen">
        <div class="p-4">HELLO</div>
      </UModal> -->
      <!-- <UFormGroup label="Slot" class="my-5">
        <USelectMenu
          v-model="chosenSlot"
          :options="slots"
          option-value="id"
          label="Slot"
          placeholder="Choose slot"
        >
          <template #option="{ option }">
            {{ option.id }} - {{ option.slot.shifts_name }}
            <span v-if="shiftType == 'regular' && option.freeUntil">
              (free until
              {{ option.freeUntil.toLocaleString(DateTime.DATE_MED) }}
              )
            </span>
          </template>

          <template #label>
            <template v-if="chosenSlot">
              {{ chosenSlot.id }} - {{ chosenSlot.slot.shifts_name }}
              <span v-if="shiftType == 'regular' && chosenSlot.freeUntil">
                (free until
                {{ chosenSlot.freeUntil.toLocaleString(DateTime.DATE_MED) }}
                )
              </span>
            </template>
            <template v-else> Choose slot </template>
          </template>
        </USelectMenu>
      </UFormGroup> -->

      <!-- <UButton
        class="w-full"
        size="lg"
        icon="i-heroicons-pencil-square"
        :loading="submitLoading"
        :disabled="!chosenSlot"
        @click="postAssignment(chosenSlot!)"
      >
        {{ t("Sign up") }}
      </UButton> -->
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
  Date: "Datum"
  Time: "Uhrzeit"
  Slots: "Slots"
  Assignments: "Anmeldungen"
  attended: "Schicht besucht"
  missed: "Schicht verpasst"
  cancelled: "Schicht abgesagt"
</i18n>
