<script setup lang="ts">
import { parse } from "marked";
import sanitizeHtml from "sanitize-html";
import type { ShiftLogsAdmin } from "~/composables";

type AdminAssignment = OccurrenceAssignment & {
  log?: ShiftLogsAdmin;
  removed?: boolean;
};

function getTime(date: Date) {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

const emit = defineEmits(["data-has-changed"]);
const props = defineProps({
  shiftOccurence: {
    type: Object as PropType<ShiftOccurrenceResponse>,
    required: true,
  },
});

const { t } = useI18n();

const occ = toRef(props.shiftOccurence);
const shift = occ.value.shift;

const occurrenceIconsStr = computed(() => {
  const icons = new Set<string>();
  for (const assignment of occ.value.assignments) {
    if (!assignment.isActive) continue;
    for (const skill of assignment.skills) {
      if (skill.show_in_occurrence_calendar) icons.add(skill.icon);
    }
  }
  return [...icons].join("");
});
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
      if (assignment.membershipId === log.shifts_membership.id) {
        (assignment as AdminAssignment).log = log;
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
  assignment: AdminAssignment,
  type: "attended" | "missed",
) {
  if (!assignment.log) {
    const log = await createShiftLog(
      type,
      assignment.membershipId,
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
const removeAssignmentObject = ref<AdminAssignment | null>(null);
const removeAssignmentIndex = ref<number | null>(null);

function startRemoveAssignmentFlow(
  assignment: AdminAssignment,
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
    !removeAssignmentObject.value.shifts_is_regular ||
    (!onetime &&
      removeAssignmentObject.value.shifts_from == startDateString)
  ) {
    // Remove one-time assignment or regular shift starting here
    await $fetch(
      `/api/shifts/assignments/${removeAssignmentObject.value.assignmentId}`,
      { method: "DELETE" },
    );
  } else if (onetime) {
    // Create one-time absence for a regular assignment
    await $fetch("/api/shifts/absences", {
      method: "POST",
      body: {
        shifts_membership: removeAssignmentObject.value.membershipId,
        shifts_assignment: removeAssignmentObject.value.assignmentId,
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
      `/api/shifts/assignments/${removeAssignmentObject.value.assignmentId}`,
      {
        method: "PUT",
        body: {
          shifts_to: startMinusOneDay.toISOString().split("T")[0],
        },
      },
    );
  }

  (removeAssignmentObject.value as AdminAssignment).removed = true;
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
  })) as { occurrences: ShiftOccurrenceResponse[] };
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

  const res = await $fetch("/api/shifts/assignments", {
    method: "POST",
    body: {
      shifts_membership: mshipID.value,
      shifts_shift: shift.id!,
      shifts_from: startDateString,
      shifts_is_regular: !onetime,
    },
  });

  occ.value.assignments.push({
    assignmentId: (res as any).id,
    membershipId: mshipID.value!,
    username: mshipData.value?.memberships_user?.username ?? "",
    username_last: mshipData.value?.memberships_user?.username_last ?? "",
    hide_name: false,
    buddy_status: "keine_angabe",
    skills: ((mshipData.value as any)?.shifts_skills ?? [])
      .map((s: any) => s.shifts_skills_id)
      .filter(Boolean),
    shifts_from: startDateString,
    shifts_to: onetime ? startDateString : undefined,
    shifts_shift: shift.id!,
    shifts_is_regular: !onetime,
    isActive: true,
    isOneTime: onetime,
    isSelf: false,
    absences: [],
    adminData: null,
  } as OccurrenceAssignment);

  createAssignmentModalIsOpen.value = false;

  occ.value.n_assigned++;
  emit("data-has-changed");
}

function getAssignmentColor(assignment: AdminAssignment) {
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
    if (assignment.membershipId === mship && assignment.isActive) {
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
            {{ shift.shifts_name }}{{ occurrenceIconsStr }}
            <span v-if="isPast">({{ t("past") }})</span>
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
              :key="assignment.assignmentId"
            >
              <ShiftsViewerModalAdminBox
                :id="assignment.assignmentId!"
                :label="t('Assignment')"
                :class="getAssignmentColor(assignment as AdminAssignment)"
                collection="shifts_assignments"
              >
                <template #header>
                  <span v-if="!assignment.isActive"> Abgemeldet: </span>
                  {{
                    displayAssignment(assignment)
                  }}
                </template>

                <template #bottom-right>
                  <div
                    v-if="assignment.isActive && !(assignment as AdminAssignment).removed"
                    class="flex flex-col gap-2"
                  >
                    <UButton
                      v-if="!isPast"
                      icon="i-heroicons-trash-16-solid"
                      size="sm"
                      :label="t('Remove assignment')"
                      @click="startRemoveAssignmentFlow(assignment as AdminAssignment, ai)"
                    />
                  </div>
                </template>

                <span v-if="assignment.isOneTime">
                  {{ t("One-time shift") }}
                </span>

                <span v-else>
                  {{ t("Regular shift") }}
                  <span v-if="assignment.shifts_to">
                    {{ t("until") }}
                    {{ assignment.shifts_to }}
                  </span>
                </span>

                <span
                  v-if="
                    assignment.adminData &&
                      assignment.adminData.shifts_assignments_count <= 1
                  "
                >
                  {{ t("(first shift!)") }}
                </span>

                <span v-if="(assignment as AdminAssignment).removed"> ({{ t("Removed") }}) </span>

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
                      ((assignment as AdminAssignment).log &&
                        (assignment as AdminAssignment).log!.shifts_type !== 'attended') ||
                      (!assignment.isActive && !(assignment as AdminAssignment).log)
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
                      @click="updateLog(assignment as AdminAssignment, 'attended')"
                    />
                  </div>
                  <div v-else class="flex flex-wrap justify-between">
                    <div>Log: Schicht wurde absolviert</div>
                    <UButton
                      size="sm"
                      label="Log auf verpasst setzen"
                      @click="updateLog(assignment as AdminAssignment, 'missed')"
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
            <UFormField :label="t('Membership number')" name="membershipID">
              <UInput v-model="mshipID" />
            </UFormField>
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
                  displayAssignment(removeAssignmentObject)
                }}
              </p>
              <p v-if="!removeAssignmentObject.shifts_is_regular">
                {{ removeAssignmentObject.shifts_from }} ({{
                  t("One-time shift")
                }})
              </p>
              <p v-else>
                {{ removeAssignmentObject.shifts_from }}
                {{ t("to") }}
                {{
                  removeAssignmentObject.shifts_to ||
                  t("No end date")
                }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
              <UButton @click="removeAssignment(true)">
                {{ t("Remove assignment for") }} {{ startDateString }}
              </UButton>
              <UButton
                v-if="removeAssignmentObject.shifts_is_regular"
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
