<script setup lang="ts">
import { parse } from "marked";
import sanitizeHtml from "sanitize-html";
import type { ShiftLogsAdmin } from "~/composables";

function getTime(date: Date) {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

const emit = defineEmits(["data-has-changed"]);
const props = defineProps({
  shiftOccurence: {
    type: Object as PropType<ShiftOccurrence>,
    required: true,
  },
});

const { t } = useI18n();

const occ = toRef(props.shiftOccurence);
const shift = occ.value.shift;
const start = new Date(occ.value.start);
const end = new Date(occ.value.end);
const startDateString = start.toISOString().split("T")[0];

const repeats = shift.shifts_repeats_every ?? 0;
const isWeeks = repeats % 7 === 0;
const frequency = isWeeks ? repeats / 7 : repeats;
const now = new Date();
const tomorrow = new Date(
  Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
  ),
);
const isPast = start.getTime() < tomorrow.getTime();
const runtimeConfig = useRuntimeConfig();

const categories = useShiftsCategories();

const mainModalIsOpen = defineModel("isOpen", {
  required: true,
  type: Boolean,
});

// SHIFT LOGS
const extraLogs = ref<ShiftLogsAdmin[]>([]);
const logsLoaded = ref(false);

getShiftLogsAdmin(startDateString, shift.id).then((logs: ShiftLogsAdmin[]) => {
  let matched = false;
  for (const log of logs) {
    matched = false;
    for (const assignment of occ.value.assignments) {
      if (
        assignment.assignment.shifts_membership.id === log.shifts_membership.id
      ) {
        assignment.log = log;
        matched = true;
      }
    }
    if (!matched) {
      extraLogs.value.push(log);
    }
  }
  logsLoaded.value = true;
});

async function updateLog(
  assignment: ShiftsAssignment,
  type: "attended" | "missed",
) {
  if (!assignment.log) {
    const log = await createShiftLog(
      type,
      assignment.assignment.shifts_membership.id,
      startDateString,
      shift.id,
      type === "attended" ? 28 : 0,
    );
    assignment.log = log;
  } else {
    await updateShiftLogsAdmin(assignment.log.id, type);
    assignment.log.shifts_type = type;
  }
}

// MEMBERSHIP DATA
type SelectedMembership = Awaited<ReturnType<typeof getMembership>>;
const mshipData = ref<SelectedMembership | null>(null);
const mshipError = ref<boolean>(false);
const mshipID = ref<number | undefined>(undefined);

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
    mshipData.value = await getMembership(mshipID.value);
  } catch (e) {
    console.error(e);
    mshipData.value = null;
    mshipError.value = true;
  }
}

// REMOVE ASSIGNMENT
const removeAssignmentModalIsOpen = ref(false);
const removeAssignmentObject = ref<AssignmentOccurrence | null>(null);
const removeAssignmentIndex = ref<number | null>(null);

function startRemoveAssignmentFlow(
  assignment: AssignmentOccurrence,
  assignmentIndex: number,
) {
  removeAssignmentObject.value = assignment;
  removeAssignmentIndex.value = assignmentIndex;
  removeAssignmentModalIsOpen.value = true;
}

async function removeAssignment(onetime: boolean) {
  if (!removeAssignmentObject.value || removeAssignmentIndex.value == null) {
    console.error("Something went wrong");
    console.log(removeAssignmentObject.value);
    console.log(removeAssignmentIndex.value);
    return;
  }

  if (
    !removeAssignmentObject.value.assignment.shifts_is_regular ||
    (!onetime &&
      removeAssignmentObject.value.assignment.shifts_from == startDateString)
  ) {
    // Remove one-time assignment or regular shift starting here
    await $fetch(
      `/api/shifts/assignments/${removeAssignmentObject.value.assignment.id}`,
      { method: "DELETE" },
    );
  } else if (onetime) {
    // Create one-time absence for a regular assignment
    await $fetch("/api/shifts/absences", {
      method: "POST",
      body: {
        shifts_membership: (
          removeAssignmentObject.value.assignment
            .shifts_membership as MembershipsMembership
        ).id,
        shifts_assignment: removeAssignmentObject.value.assignment.id,
        shifts_is_for_all_assignments: false,
        shifts_from: startDateString,
        shifts_to: startDateString,
        shifts_status: "accepted",
      },
    });
  } else {
    // Stop regular assignment on the day before
    const startMinusOneDay = new Date();
    startMinusOneDay.setDate(start.getDate() - 1);
    await $fetch(
      `/api/shifts/assignments/${removeAssignmentObject.value.assignment.id}`,
      {
        method: "PUT",
        body: {
          shifts_to: startMinusOneDay.toISOString().split("T")[0],
        },
      },
    );
  }

  removeAssignmentObject.value.removed = true;
  removeAssignmentModalIsOpen.value = false;
  occ.value.n_assigned--;
  emit("data-has-changed");
}

// CREATE ASSIGNMENT FLOW
const createAssignmentModalIsOpen = ref(false);

function startCreateAssignmentFlow() {
  mshipID.value = undefined;
  createAssignmentModalIsOpen.value = true;
}

async function fetchOccurrences(date: string, shiftID: number) {
  return (await $fetch("/api/shifts/occurrences", {
    query: {
      from: date,
      to: date,
      shiftID: shiftID,
    },
  })) as { occurrences: ShiftOccurrence[] };
}

async function createAssignment(onetime: boolean) {
  if (!mshipID.value) {
    console.error("No membership ID chosen");
    return;
  }

  // Check if shift is already full (parallel signup)
  const ress = await fetchOccurrences(startDateString, shift.id!);
  const occurrences = ress.occurrences;

  if (occurrences.length != 1) {
    throw new Error("No or multiple occurrences found");
  }
  const occl = occurrences[0];
  if (occl.n_assigned >= occl.shift.shifts_slots) {
    const m = "Somebody else has just signed up for this shift";
    showToast({
      type: "info",
      description: m,
    });
    emit("data-has-changed");
    throw new Error(m);
  }

  const res = (await $fetch("/api/shifts/assignments", {
    method: "POST",
    body: {
      shifts_membership: mshipID.value,
      shifts_shift: shift.id!,
      shifts_from: startDateString,
      shifts_is_regular: !onetime,
    },
  })) as ShiftsAssignment;

  occ.value.assignments.push({
    assignment: res,
    isActive: true,
    isOneTime: onetime,
    absences: [],
  } as AssignmentOccurrence);

  createAssignmentModalIsOpen.value = false;

  occ.value.n_assigned++;
  emit("data-has-changed");
}

function getAssignmentColor(assignment: AssignmentOccurrence) {
  if (!assignment.isActive || assignment.removed) {
    return "bg-gray-100";
  }

  if (assignment.log && assignment.log.shifts_type !== "attended") {
    return "bg-red-100";
  }

  if (assignment.isOneTime) {
    return "bg-green-100";
  }

  return "bg-primary-100";
}

function checkIfMshipInAssignments(mship: number) {
  for (const assignment of occ.value.assignments) {
    if (
      (assignment.assignment.shifts_membership as MembershipsMembership).id ===
        mship &&
      assignment.isActive
    ) {
      return true;
    }
  }
  return false;
}
</script>

<template>
  <UModal v-model:open="mainModalIsOpen" :ui="{ width: 'sm:max-w-[1000px]' }">
    <template #content>
      <div class="m-10">
        <div class="flex items-start justify-between">
          <h2>
            {{ shift.shifts_name }} <span v-if="isPast">({{ t("past") }})</span>
          </h2>
          <a
            :href="`${runtimeConfig.public.directusUrl}/admin/content/shifts_shifts/${shift.id}`"
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
            {{ start.toISOString().split("T")[0] }}
          </div>

          <div v-if="shift.shifts_is_all_day">
            {{ t("All day") }}
          </div>
          <div v-else>
            {{ t("Time") }}: {{ getTime(start) }} - {{ getTime(end) }}
          </div>
          <div v-if="categories.loaded">
            {{ t("Category") }}:
            {{
              t(
                categories.data.value.find(
                  (category) => category.id === shift.shifts_category_2,
                )?.name ?? "Normal",
              )
            }}
          </div>

          <div v-if="shift.shifts_location">
            {{ t("Location") }}:
            {{ shift.shifts_location }}
          </div>
        </div>

        <!-- eslint-disable vue/no-v-html -->
        <p
          v-if="shift.shifts_description"
          class="mb-5"
          v-html="sanitizeHtml(parse(shift.shifts_description) as string)"
        />
        <!-- eslint-enable -->

        <!-- Shift assignments and logs -->
        <div>
          <div class="flex flex-row items-end mb-5">
            <div class="grow">
              <h2>
                Anmeldungen / Logs [{{ occ.n_assigned }}/{{
                  occ.shift.shifts_slots
                }}]
              </h2>
            </div>
            <div class="mb-1">
              <UButton
                v-if="!isPast"
                :label="t('Create assignment')"
                size="md"
                icon="i-heroicons-plus-16-solid"
                :disabled="occ.n_assigned >= occ.shift.shifts_slots"
                @click="startCreateAssignmentFlow()"
              />
            </div>
          </div>

          <div v-if="logsLoaded" class="flex flex-col gap-3 my-2">
            <template
              v-for="(assignment, ai) of occ.assignments"
              :key="assignment.assignment.id"
            >
              <ShiftsViewerModalAdminBox
                :id="assignment.assignment.id!"
                :label="t('Assignment')"
                :class="getAssignmentColor(assignment)"
                collection="shifts_assignments"
              >
                <template #header>
                  <span v-if="!assignment.isActive"> Abgemeldet: </span>
                  {{
                    displayMembership(assignment.assignment.shifts_membership)
                  }}
                </template>

                <template #bottom-right>
                  <div
                    v-if="assignment.isActive && !assignment.removed"
                    class="flex flex-col gap-2"
                  >
                    <UButton
                      v-if="!isPast"
                      icon="i-heroicons-trash-16-solid"
                      size="sm"
                      :label="t('Remove assignment')"
                      @click="startRemoveAssignmentFlow(assignment, ai)"
                    />
                  </div>
                </template>

                <span v-if="assignment.isOneTime">
                  {{ t("One-time shift") }}
                </span>

                <span v-else>
                  {{ t("Regular shift") }}
                  <span v-if="assignment.assignment.shifts_to">
                    {{ t("until") }}
                    {{ assignment.assignment.shifts_to }}
                  </span>
                </span>

                <span
                  v-if="
                    assignment.assignment.shifts_membership
                      .shifts_assignments_count <= 1
                  "
                >
                  {{ t("(first shift!)") }}
                </span>

                <span v-if="assignment.removed"> ({{ t("Removed") }}) </span>

                <div v-for="absence of assignment.absences" :key="absence.id">
                  {{ t("Absent") }}: {{ absence.shifts_from }} {{ t("to") }}
                  {{ absence.shifts_to }}
                </div>

                <div v-if="isPast">
                  <!-- Wenn es einen non-attendance log gibt, wurde die Schicht verpasst. 
                 Wenn es keinen log gibt, und die schicht wurde abgesagt, 
                 dann ist die Person wie geplant nicht gekommen. 
                 Wenn es keine absage gibt und keinen log, 
                 gehen wir davon aus dass die schicht stattgefunden hat -
                 in diesem Fall wird automatisch ein Log vom Cronjob erstellt
                 (außer schichtdaten werden nachträglich für die vergangenheit geändert) -->
                  <div
                    v-if="
                      (assignment.log &&
                        assignment.log.shifts_type !== 'attended') ||
                      (!assignment.isActive && !assignment.log)
                    "
                    class="flex flex-wrap justify-between"
                  >
                    <div v-if="assignment.isActive">
                      Log: Schicht wurde verpasst
                    </div>
                    <div v-else>Log: Schicht wurde abgesagt</div>
                    <UButton
                      size="sm"
                      label="Log auf absolviert setzen"
                      @click="updateLog(assignment, 'attended')"
                    />
                  </div>
                  <div v-else class="flex flex-wrap justify-between">
                    <div>Log: Schicht wurde absolviert</div>
                    <UButton
                      size="sm"
                      label="Log auf verpasst setzen"
                      @click="updateLog(assignment, 'missed')"
                    />
                  </div>
                </div>
              </ShiftsViewerModalAdminBox>
            </template>
          </div>
        </div>

        <!-- Logs -->
        <div v-if="isPast && logsLoaded">
          <ShiftsViewerModalAdminLogs :logs="extraLogs" :occurence="occ" />
        </div>
      </div>

      <!-- CREATE ASSIGNMENT FLOW -->

      <UModal v-model:open="createAssignmentModalIsOpen" :transition="false">
        <template #content>
          <div class="p-10 flex flex-col gap-4">
            <h2>{{ t("Create assignment") }}</h2>
            <UFormGroup :label="t('Membership number')" name="membershipID">
              <UInput v-model="mshipID" />
            </UFormGroup>
            <UButton @click="loadMembership">{{
              t("Load membership")
            }}</UButton>

            <div v-if="mshipData">
              <p class="font-bold">
                {{ mshipData.memberships_user.username }}
                {{ mshipData.memberships_user.username_last ?? "" }}
              </p>
              <p>
                {{ t("Membership type") }}: {{ mshipData.memberships_type }}
              </p>

              <p>
                {{ t("Membership status") }}:
                {{ t(mshipData.memberships_status) }}
              </p>

              <p>{{ t("Shift type") }}: {{ t(mshipData.shifts_user_type) }}</p>

              <p v-if="mshipData.shifts_skills">
                {{ t("Skills") }}:
                <span v-for="skill in mshipData.shifts_skills" :key="skill">
                  {{ t("skill:" + skill) }},
                </span>
              </p>

              <div
                v-if="checkIfMshipInAssignments(mshipData.id)"
                class="bg-red-100 p-2 rounded-md mt-3 font-bold"
              >
                {{ t("Member is already assigned for this shift") }}
              </div>
              <div v-else>
                <div class="flex flex-wrap gap-2 mt-3">
                  <UButton class="w-full" @click="createAssignment(true)">{{
                    t("Create one-time assignment")
                  }}</UButton>
                  <UButton
                    v-if="props.shiftOccurence.shift.shifts_is_regular"
                    class="w-full"
                    @click="createAssignment(false)"
                    >{{ t("Create regular assignment") }}</UButton
                  >
                </div>
              </div>
            </div>
            <div v-if="mshipError">
              {{ t("Member") }} {{ mshipID }} {{ t("not found") }}
            </div>
          </div>
        </template>
      </UModal>

      <!-- REMOVE ASSIGNMENT FLOW -->

      <UModal
        v-if="removeAssignmentObject"
        v-model:open="removeAssignmentModalIsOpen"
        :transition="false"
      >
        <template #content>
          <div class="p-10 flex flex-col gap-4">
            <h2>{{ t("Remove assignment") }}</h2>
            <div>
              <p>
                {{
                  displayMembership(
                    removeAssignmentObject.assignment.shifts_membership,
                  )
                }}
              </p>
              <p v-if="!removeAssignmentObject.assignment.shifts_is_regular">
                {{ removeAssignmentObject.assignment.shifts_from }} ({{
                  t("One-time shift")
                }})
              </p>
              <p v-else>
                {{ removeAssignmentObject.assignment.shifts_from }}
                {{ t("to") }}
                {{
                  removeAssignmentObject.assignment.shifts_to ||
                  t("No end date")
                }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
              <UButton @click="removeAssignment(true)">
                {{ t("Remove assignment for") }} {{ startDateString }}
              </UButton>
              <UButton
                v-if="removeAssignmentObject.assignment.shifts_is_regular"
                @click="removeAssignment(false)"
              >
                {{ t("Remove for ") }} {{ startDateString }}
                {{ t("and all future dates") }}
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
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
  No end date: "Kein Enddatum"
  Create log: "Logeintrag erstellen"
  Attended: "Absolviert"
  Cancelled: "Abgesagt"
  Missed: "Verpasst"
  Suggestions: "Vorschläge"
  Log entry exists: "Logeintrag existiert"
  Load membership: "Mitgliedschaft laden"
  Create one-time assignment: "Einmalige Anmeldung erstellen"
  Create regular assignment: "Festschicht Anmeldung erstellen"
  Assigned: "Angemeldet"
  Absent: "Abwesend"
  Membership type: "Mitgliedschaftstyp"
  Membership status: "Mitgliedschaftsstatus"
  Shift type: "Schichttyp"
  regular: "Festschicht"
  jumper: "Springer*in"
  inactive: "Inaktiv"
  exempt: "Befreit"
  approved: "Aufgenommen"
  applied: "Beworben"
  in-exclusion: "Im Ausschluss"
  in-cancellation: "Im Ausstieg"
  ended: "Beendet"
  draft: "Entwurf"
  Removed: "Entfernt"
  Location: "Ort"
  All day: "Ganztägig"

  "Required skills": "Benötigte Fähigkeiten"

  Skills: "Fähigkeiten"
  Category: Kategorie
  Member is already assigned  for this shift: "Mitglied ist bereits für diese Schicht angemeldet"
</i18n>
