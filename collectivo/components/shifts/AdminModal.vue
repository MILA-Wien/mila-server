<script setup lang="ts">
import { DateTime } from "luxon";
import { parse } from "marked";
import {
  createItem,
  deleteItem,
  readItem,
  readItems,
  updateItem,
} from "@directus/sdk";
import sanitizeHtml from "sanitize-html";

const emit = defineEmits(["data-has-changed"]);
const props = defineProps({
  shiftOccurence: {
    type: Object as PropType<ShiftOccurrence>,
    required: true,
  },
});

const { t } = useI18n();
const directus = useDirectus();

const shift = props.shiftOccurence.shift;
const start = props.shiftOccurence.start;
const startDate = start.toISO()!.split("T")[0];
const end = props.shiftOccurence.end;
const repeats = shift.shifts_repeats_every ?? 0;
const isWeeks = repeats % 7 === 0;
const frequency = isWeeks ? repeats / 7 : repeats;
const isPast = start < DateTime.now();
const chosenSlot = ref<SlotOccurrence | null>(null);

const mainModalIsOpen = defineModel("isOpen", {
  required: true,
  type: Boolean,
});

// SHIFT LOGS

const logs = ref<ShiftsLog[]>([]);
const logEntryOptions = ["attended", "missed", "cancelled", "other"];
const createLogModalIsOpen = ref(false);
const logEntryType = ref<string | null>(null);
const logEntryScore = ref(0);
const logEntryNote = ref<string | null>(null);

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

  for (const log of logs.value) {
    // Check if there is an assignment with that log
    for (const slot of props.shiftOccurence.slots) {
      for (const assignment of slot.assignments) {
        if (assignment.shifts_membership.id === log.shifts_membership.id) {
          assignment._logged = true;
        }
      }
    }
  }
}

getLogs();

async function createLog(
  type: string,
  mshipID: number,
  assignment?: ShiftsAssignment,
  score?: number,
  note?: string,
  shift_?: number,
) {
  if (!score) {
    score = type === "attended" ? 1 : type === "missed" ? -1 : 0;
  }

  const log = (await directus.request(
    createItem(
      "shifts_logs",
      {
        shifts_membership: mshipID,
        shifts_type: type,
        shifts_date: startDate,
        shifts_score: score,
        shifts_note: note,
        shifts_shift: shift_ ?? Number(shift.id),
      },
      {
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
      },
    ),
  )) as ShiftsLog;

  logs.value.push(log);
  if (assignment) {
    assignment._logged = true;
  }

  return log;
}

function startLogCreationFlow() {
  logEntryType.value = "other";
  logEntryScore.value = 0;
  logEntryNote.value = null;
  createLogModalIsOpen.value = true;
}

async function createCustomLog() {
  const log = await createLog(
    logEntryType.value!,
    mshipID.value!,
    undefined,
    logEntryScore.value,
    logEntryNote.value ?? undefined,
  );
  createLogModalIsOpen.value = false;
  return log;
}

// MEMBERSHIP DATA FLOW

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

function displayMembership(mship: MembershipsMembership) {
  const user = mship.memberships_user;
  return `M${mship.id} ${user.first_name} ${user.last_name}`;
}

// REMOVE ASSIGNMENT FLOW

const removeAssignmentModalIsOpen = ref(false);
const removeAssignmentObject = ref<ShiftsAssignment | null>(null);
const removeAssignmentIndex = ref<number | null>(null);

function startRemoveAssignmentFlow(
  assignment: ShiftsAssignment,
  assignmentIndex: number,
  slot: SlotOccurrence,
) {
  removeAssignmentObject.value = assignment;
  removeAssignmentIndex.value = assignmentIndex;
  chosenSlot.value = slot;
  removeAssignmentModalIsOpen.value = true;
}

async function removeAssignment(onetime: boolean) {
  if (
    !removeAssignmentObject.value ||
    !chosenSlot.value ||
    removeAssignmentIndex.value == null
  ) {
    console.error("Something went wrong");
    console.log(removeAssignmentObject.value);
    console.log(chosenSlot.value);
    console.log(removeAssignmentIndex.value);
    return;
  }

  if (
    removeAssignmentObject.value.shifts_from ==
      removeAssignmentObject.value.shifts_to ||
    (!onetime && removeAssignmentObject.value.shifts_from == startDate)
  ) {
    // Remove one-time assignment
    await directus.request(
      deleteItem("shifts_assignments", removeAssignmentObject.value.id!),
    );
  } else if (onetime) {
    // Create one-time absence for a regular assignment
    await directus.request(
      createItem("shifts_absences", {
        shifts_membership: (
          removeAssignmentObject.value
            .shifts_membership as MembershipsMembership
        ).id,
        shifts_assignment: removeAssignmentObject.value.id,
        shifts_from: startDate,
        shifts_to: startDate,
        shifts_status: "approved",
      }),
    );
  } else {
    // Stop regular assignment on the day before
    await directus.request(
      updateItem("shifts_assignments", removeAssignmentObject.value.id!, {
        shifts_to: start.minus({ days: 1 }).toISO()!.split("T")[0],
      }),
    );
  }

  // Remove assignment from slot
  removeAssignmentObject.value._removed = true;
  removeAssignmentModalIsOpen.value = false;
  chosenSlot.value.removedAssignments = true;
  emit("data-has-changed");
}

// CREATE ASSIGNMENT FLOW

const createAssignmentModalIsOpen = ref(false);

function startCreateAssignmentFlow(slot: SlotOccurrence) {
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
    shifts_slot: chosenSlot.value.slot.id,
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

  chosenSlot.value.assignments.push(res);

  createAssignmentModalIsOpen.value = false;
  emit("data-has-changed");
}
</script>

<template>
  <UModal v-model="mainModalIsOpen" :ui="{ width: 'sm:max-w-[1000px]' }">
    <div class="m-10">
      <div class="flex items-center justify-between">
        <h2>
          {{ shift.shifts_name }} <span v-if="isPast">( {{ t("past") }} )</span>
        </h2>
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
      <div v-if="!isPast">
        <h2>{{ t("Assignments") }}</h2>

        <div class="flex flex-col gap-2 my-2">
          <ShiftsAdminModalBox
            v-for="slot of props.shiftOccurence.slots"
            :id="slot.slot.id"
            :key="slot.slot.id"
            class="bg-gray-100"
            :label="t('Slot')"
            collection="shifts_slots"
          >
            <template #header>{{ slot.slot.shifts_name }}</template>

            <div class="flex flex-col gap-3 mb-3">
              <template v-for="(assignment, ai) of slot.assignments">
                <ShiftsAdminModalBox
                  v-if="!assignment._removed"
                  :id="assignment.id!"
                  :key="assignment.id"
                  :label="t('Assignment')"
                  class="bg-green-100"
                  collection="shifts_assignments"
                >
                  <template #header>{{
                    displayMembership(
                      assignment.shifts_membership as MembershipsMembership,
                    )
                  }}</template>
                  {{ assignment.shifts_from }} {{ t("to") }}
                  {{ assignment.shifts_to || t("no end date") }}

                  <div class="flex flex-wrap gap-2 mt-2">
                    <UButton
                      :label="t('Remove assignment')"
                      @click="startRemoveAssignmentFlow(assignment, ai, slot)"
                    />
                  </div>
                </ShiftsAdminModalBox>
              </template>
              <template v-for="assignment of slot.absentAssignments">
                <ShiftsAdminModalBox
                  v-if="!assignment._removed"
                  :id="assignment.id!"
                  :key="assignment.id"
                  class="bg-red-100"
                  :label="t('Assignment')"
                  collection="shifts_assignments"
                >
                  <template #header
                    >{{ t("Absent") }}:
                    {{
                      displayMembership(
                        assignment.shifts_membership as MembershipsMembership,
                      )
                    }}</template
                  >
                  {{ assignment.shifts_from }} {{ t("to") }}
                  {{ assignment.shifts_to || t("no end date") }}
                </ShiftsAdminModalBox>
              </template>
            </div>

            <UButton
              v-if="slot.assignments.length == 0 || slot.removedAssignments"
              :label="t('Create assignment')"
              @click="startCreateAssignmentFlow(slot)"
            />
          </ShiftsAdminModalBox>
        </div>
      </div>

      <!-- Logs -->
      <div v-if="isPast">
        <h2 class="mb-2 mt-6">{{ t("Assignments") }}</h2>
        <div class="flex flex-col gap-2">
          <template v-for="slot of props.shiftOccurence.slots" :key="slot.id">
            <template
              v-for="assignment of slot.assignments"
              :key="assignment.id"
            >
              <ShiftsAdminModalBox
                :id="assignment.id!"
                :label="t('Assignment')"
                collection="shifts_assignments"
              >
                <template #header>
                  {{
                    displayMembership(
                      assignment.shifts_membership as MembershipsMembership,
                    )
                  }}</template
                >

                <div v-if="!assignment._logged">
                  <div>{{ t("Create log") }}:</div>
                  <div class="flex flex-wrap gap-3 mt-3">
                    <UButton
                      @click="
                        createLog(
                          'attended',
                          assignment.shifts_membership.id,
                          assignment,
                        )
                      "
                      >{{ t("Attended") }} (+1)</UButton
                    >
                    <UButton
                      @click="
                        createLog(
                          'cancelled',
                          assignment.shifts_membership.id,
                          assignment,
                        )
                      "
                      >{{ t("Cancelled") }} (+0)</UButton
                    >
                    <UButton
                      @click="
                        createLog(
                          'missed',
                          assignment.shifts_membership.id,
                          assignment,
                        )
                      "
                      >{{ t("Missed") }} (-1)</UButton
                    >
                  </div>
                </div>
                <div v-else>
                  <div>{{ t("Log entry exists") }}</div>
                </div>
              </ShiftsAdminModalBox>
            </template>
          </template>
          <h2 class="mb-2 mt-6">{{ t("Logs") }}</h2>
          <template v-for="log of logs" :key="log.id">
            <ShiftsAdminModalBox
              :id="log.id!"
              label="Log"
              collection="shifts_logs"
            >
              <template #header>{{
                displayMembership(
                  log.shifts_membership as MembershipsMembership,
                )
              }}</template>
              <p>{{ t(log.shifts_type) }} ({{ log.shifts_score }})</p>
              <p v-if="log.shifts_note">Notes: {{ log.shifts_note }}</p>
            </ShiftsAdminModalBox>
          </template>
        </div>
        <div class="mt-3">
          <UButton @click="startLogCreationFlow">{{ t("Create log") }}</UButton>
        </div>
      </div>
    </div>

    <!-- CREATE ASSIGNMENT FLOW -->

    <UModal v-model="createAssignmentModalIsOpen" :transition="false">
      <div class="p-10 flex flex-col gap-4">
        <h2>{{ t("Create assignment") }}</h2>
        <UFormGroup :label="t('Membership number')" name="membershipID">
          <UInput v-model="mshipID" />
        </UFormGroup>
        <UButton @click="loadMembership">{{ t("Load membership") }}</UButton>

        <div v-if="mshipData">
          <p class="font-bold">
            {{ mshipData.memberships_user.first_name }}
            {{ mshipData.memberships_user.last_name }}
          </p>
          <p>Membership type: {{ mshipData.memberships_type }}</p>

          <p>Membership status: {{ mshipData.memberships_status }}</p>

          <p>Shift type: {{ mshipData.shifts_user_type }}</p>

          <div class="flex flex-wrap gap-2 mt-3">
            <UButton @click="createAssignment(true)">{{
              t("Create one-time assignment")
            }}</UButton>
            <UButton @click="createAssignment(false)">{{
              t("Create regular assignment")
            }}</UButton>
          </div>
        </div>
        <div v-if="mshipError">
          {{ t("Member") }} {{ mshipID }} {{ t("not found") }}
        </div>
      </div>
    </UModal>

    <!-- REMOVE ASSIGNMENT FLOW -->

    <UModal
      v-if="removeAssignmentObject"
      v-model="removeAssignmentModalIsOpen"
      :transition="false"
    >
      <div class="p-10 flex flex-col gap-4">
        <h2>{{ t("Remove assignment") }}</h2>
        <div>
          <p>
            {{
              displayMembership(
                removeAssignmentObject.shifts_membership as MembershipsMembership,
              )
            }}
          </p>
          <p
            v-if="
              removeAssignmentObject.shifts_from ==
              removeAssignmentObject.shifts_to
            "
          >
            {{ removeAssignmentObject.shifts_from }} ({{ t("One-time shift") }})
          </p>
          <p v-else>
            {{ removeAssignmentObject.shifts_from }} {{ t("to") }}
            {{ removeAssignmentObject.shifts_to || t("No end date") }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <UButton @click="removeAssignment(true)">
            {{ t("Remove assignment for") }} {{ startDate }}
          </UButton>
          <UButton
            v-if="
              removeAssignmentObject.shifts_from !=
              removeAssignmentObject.shifts_to
            "
            @click="removeAssignment(false)"
          >
            {{ t("Remove for ") }} {{ startDate }}
            {{ t("and all future dates") }}
          </UButton>
        </div>
      </div>
    </UModal>

    <UModal v-model="createLogModalIsOpen" :transition="false">
      <div class="p-10 flex flex-col gap-4">
        <h2>{{ t("Create log entry") }}</h2>
        <UFormGroup :label="t('Membership number')" name="membershipID">
          <UInput v-model="mshipID" />
        </UFormGroup>
        <UButton @click="loadMembership">{{ t("Load membership") }}</UButton>

        <div v-if="mshipData">
          <p class="font-bold">
            {{ mshipData.memberships_user.first_name }}
            {{ mshipData.memberships_user.last_name }}
          </p>
          <p>Membership type: {{ mshipData.memberships_type }}</p>

          <p>Membership status: {{ mshipData.memberships_status }}</p>

          <p>Shift type: {{ mshipData.shifts_user_type }}</p>

          <UFormGroup :label="t('Type')" name="logEntryType">
            <USelect v-model="logEntryType" :options="logEntryOptions" />
          </UFormGroup>

          <UFormGroup :label="t('Score')" name="logEntryScore">
            <UInput v-model="logEntryScore" />
          </UFormGroup>

          <UFormGroup :label="t('Note')" name="logEntryNote">
            <UInput v-model="logEntryNote" />
          </UFormGroup>

          <div class="flex flex-wrap gap-2 mt-3">
            <UButton @click="createCustomLog()">{{
              t("Create log entry")
            }}</UButton>
          </div>
        </div>
        <div v-if="mshipError">
          {{ t("Member") }} {{ mshipID }} {{ t("not found") }}
        </div>
      </div>
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
  Remove assignment for: "Anmeldung entfernen für"
  and all future dates: "und alle zukünftigen Termine"
  Create assignment: "Anmeldung erstellen"
  Shift: "Schicht"
  attended: "Schicht absolviert"
  missed: "Schicht verpasst"
  cancelled: "Schicht abgesagt"
  past: "vergangen"
  no end date: "kein Enddatum"
  Create log: "Logeintrag erstellen"
  Attended: "Absolviert"
  Cancelled: "Abgesagt"
  Missed: "Verpasst"
  Suggestions: "Vorschläge"
  Log entry exists: "Logeintrag existiert"
</i18n>
