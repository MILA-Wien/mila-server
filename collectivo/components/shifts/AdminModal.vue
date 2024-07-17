<script setup lang="ts">
import { DateTime } from "luxon";
import { parse } from "marked";
import { createItem, deleteItem, readItem, readItems } from "@directus/sdk";
import sanitizeHtml from "sanitize-html";

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

const { t } = useI18n();
const directus = useDirectus();
const user = useCollectivoUser();

const shift = props.shiftOccurence.shift;
const start = props.shiftOccurence.start;
const startDate = start.toISO()!.split("T")[0];
const end = props.shiftOccurence.end;
const repeats = shift.shifts_repeats_every ?? 0;
const isWeeks = repeats % 7 === 0;
const frequency = isWeeks ? repeats / 7 : repeats;
const slots = ref<SlotContainer[]>([]);
const isPast = start < DateTime.now();
const chosenSlot = ref<SlotRrule | null>(null);

// Modals ------------------------------------------------------------------------

const mainModalIsOpen = defineModel("isOpen", {
  required: true,
  type: Boolean,
});
const createAssignmentModalIsOpen = ref(false);
const removeAssignmentModalIsOpen = ref(false);
const createLogModalIsOpen = ref(false);

// Membership data flow -----------------------------------------------------------

const mshipData = ref<MembershipsMembership | null>(null);
const mshipError = ref<boolean>(false);
const mshipID = ref<number | null>(null);

watch(mshipID, () => {
  mshipData.value = null;
  mshipError.value = false;
});

async function loadMembership() {
  if (!mshipID.value) {
    mshipError.value = true;
    return;
  }
  try {
    mshipData.value = (await directus.request(
      readItem("memberships", mshipID.value, {
        fields: [
          "id",
          { memberships_user: ["first_name", "last_name"] },
          "memberships_type",
          "memberships_status",
          "shifts_user_type",
        ],
      }),
    )) as MembershipsMembership;
  } catch (e) {
    console.error(e);
    mshipData.value = null;
    mshipError.value = true;
  }
}

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
            // @ts-expect-error Directus bug does not allow _gte on date fields
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

const logs = ref<ShiftsLog[]>([]);

async function getLogs() {
  logs.value = (await directus.request(
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
        {
          shifts_membership: [
            "id",
            { memberships_user: ["first_name", "last_name", "email"] },
          ],
        },
      ],
    }),
  )) as ShiftsLog[];
}

getLogs();

function getUserString(mship: MembershipsMembership) {
  const user = mship.memberships_user;
  return `M${mship.id} ${user.first_name} ${user.last_name}`;
}

async function removeAssignment(
  assignmentID: number,
  slot: SlotRrule,
  assIndex: number,
) {
  await directus.request(deleteItem("shifts_assignments", assignmentID));
  slot.assignments.splice(assIndex); // Remove assignment from slot
}

// CREATE ASSIGNMENT FLOW

function startAssignmentFlow(slot: SlotRrule) {
  chosenSlot.value = slot;
  mshipID.value = null;
  createAssignmentModalIsOpen.value = true;
}

async function createAssignment(onetime: boolean) {
  if (!mshipID.value) {
    console.error("No membership ID chosen");
    return;
  }

  if (!chosenSlot.value) {
    console.error("No slot chosen");
    return;
  }

  const payload: ShiftsAssignment = {
    shifts_membership: mshipID.value,
    shifts_slot: chosenSlot.value.id,
    shifts_from: startDate,
  };

  if (onetime) {
    payload.shifts_to = startDate;
  }

  const res = (await directus.request(
    createItem("shifts_assignments", payload, {
      fields: [
        "id",
        "shifts_membership",
        "shifts_slot",
        "shifts_from",
        {
          shifts_membership: [
            "id",
            { memberships_user: ["first_name", "last_name", "email"] },
          ],
        },
      ],
    }),
  )) as ShiftsAssignment;

  chosenSlot.value.assignments.push({
    assignment: res,
    rrule: null,
  });

  createAssignmentModalIsOpen.value = false;
}
</script>

<template>
  <UModal v-model="mainModalIsOpen" :ui="{ width: 'sm:max-w-[1000px]' }">
    <div class="m-10">
      <div class="flex items-center justify-between">
        <h2>{{ shift.shifts_name }}</h2>
        <a
          :href="`http://localhost:8055/admin/content/shifts_shift/${shift.id}`"
          target="blank"
          class="flex flex-row items-center align-middle text-xs gap-1"
        >
          <span class="text-xs">{{ t("Shift") }} {{ shift.id }}</span>
          <UIcon name="i-heroicons-arrow-top-right-on-square-16-solid" />
        </a>
      </div>

      <!-- Shift infos -->
      <div class="font-bold text-lg my-5 leading-7">
        <div>
          <span v-if="frequency">
            {{ t("Regular shift") }}
            ({{ frequency }} {{ isWeeks ? t("weeks") : t("days") }})
          </span>
          <span v-else>
            {{ t("One-time shift") }}
          </span>
        </div>

        <div>
          {{ t("Date") }}:
          {{ start.toLocaleString(DateTime.DATE_MED) }}
          <span v-if="isPast">( {{ t("past") }} )</span>
        </div>

        <div>
          {{ t("Time") }}:
          {{ start.toLocaleString(DateTime.TIME_24_SIMPLE) }}
          {{ t("to") }}
          {{ end.toLocaleString(DateTime.TIME_24_SIMPLE) }}
        </div>
      </div>

      <!-- eslint-disable vue/no-v-html -->
      <p
        v-if="shift.shifts_description"
        class="mb-5"
        v-html="sanitizeHtml(parse(shift.shifts_description) as string)"
      />
      <!-- eslint-enable -->

      <!-- Shift slots -->
      <h2>{{ t("Slots") }}</h2>

      <div class="flex flex-col gap-2 my-2">
        <ShiftsObjectBox
          v-for="slot of props.shiftOccurence.slots"
          :id="slot.id"
          :key="slot.id"
          :label="t('Slot')"
          collection="shifts_slots"
        >
          <template #header>{{ slot.slot.shifts_name }}</template>

          <ShiftsObjectBox
            v-for="(assignment, assIndex) of slot.assignments"
            :id="assignment.assignment.id!"
            :key="assignment.assignment.id"
            :label="t('Assignment')"
            collection="shifts_assignments"
          >
            <template #header>{{
              getUserString(
                assignment.assignment
                  .shifts_membership as MembershipsMembership,
              )
            }}</template>
            {{ assignment.assignment.shifts_from }} to
            {{ assignment.assignment.shifts_to || "indefinite" }}

            <div class="flex flex-wrap gap-2">
              <UButton
                label="Remove assignment"
                @click="
                  removeAssignment(assignment.assignment.id!, slot, assIndex)
                "
              />
            </div>
          </ShiftsObjectBox>

          <UButton
            v-if="slot.assignments.length == 0"
            label="Create assignment"
            @click="startAssignmentFlow(slot)"
          />
        </ShiftsObjectBox>
      </div>

      <!-- Logs -->
      <h2 class="mb-2 mt-6">{{ t("Logs") }}</h2>
      <div v-for="log of logs" :key="log.id">
        <ShiftsObjectBox :id="log.id!" label="Log" collection="shifts_logs">
          <template #header>{{ t(log.shifts_type) }}</template>
          <p>
            {{ getUserString(log.shifts_membership as MembershipsMembership) }}
          </p>
          <p v-if="log.shifts_note">Notes: {{ log.shifts_note }}</p>
        </ShiftsObjectBox>
      </div>
    </div>

    <UModal v-model="createAssignmentModalIsOpen" :transition="false">
      <div class="p-10 flex flex-col gap-4">
        <h2>{{ t("Create assignment") }}</h2>
        <UFormGroup label="Membership number" name="membershipID">
          <UInput v-model="mshipID" />
        </UFormGroup>
        <UButton @click="loadMembership">Load membership</UButton>

        <div v-if="mshipData">
          <p class="font-bold">
            {{ mshipData.memberships_user.first_name }}
            {{ mshipData.memberships_user.last_name }}
          </p>
          <p>Membership type: {{ mshipData.memberships_type }}</p>

          <p>Membership status: {{ mshipData.memberships_status }}</p>

          <p>Shift type: {{ mshipData.shifts_user_type }}</p>

          <div class="flex flex-wrap gap-2 mt-3">
            <UButton @click="createAssignment(true)"
              >Create one-time assignment</UButton
            >
            <UButton @click="createAssignment(false)"
              >Create regular assignment</UButton
            >
          </div>
        </div>
        <div v-if="mshipError">Member {{ mshipID }} not found</div>
      </div>
    </UModal>

    <UModal v-model="removeAssignmentModalIsOpen" :transition="false">
      <div class="p-4">HELLO</div>
    </UModal>

    <UModal v-model="createLogModalIsOpen" :transition="false">
      <div class="p-4">HELLO</div>
    </UModal>
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
  Assignment: "Anmeldung"
  Remove assignment: "Anmeldung entfernen"
  Create assignment: "Anmeldung erstellen"
  Shift: "Schicht"
  attended: "Schicht besucht"
  missed: "Schicht verpasst"
  cancelled: "Schicht abgesagt"
  past: "vergangen"
</i18n>
