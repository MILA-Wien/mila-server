<script setup lang="ts">
import { parse } from "marked";
import { createItem, deleteItem, readItem, updateItem } from "@directus/sdk";
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
const directus = useDirectus();

const occ = props.shiftOccurence;
const shift = occ.shift;
const start = new Date(occ.start);
const end = new Date(occ.end);
const startDateString = start.toISOString().split("T")[0];
const repeats = shift.shifts_repeats_every ?? 0;
const isWeeks = repeats % 7 === 0;
const frequency = isWeeks ? repeats / 7 : repeats;
const now = new Date();
const isPast = start.getTime() < now.getTime();
const runtimeConfig = useRuntimeConfig();

const categories = useShiftsCategories();

const mainModalIsOpen = defineModel("isOpen", {
  required: true,
  type: Boolean,
});

// SHIFT LOGS
const logs = ref<ShiftLogsAdmin[]>([]);
const logEntryOptions = ["attended", "missed", "cancelled", "other"];
const logModalIsOpen = ref(false);
const logEntryType = ref<string | null>(null);
const logEntryScore = ref(0);
const logEntryNote = ref<string | null>(null);

getShiftLogsAdmin(startDateString, shift.id).then(
  (logs_: ShiftLogsAdmin[]) => (logs.value = logs_),
);

function openLogModal() {
  logEntryType.value = "other";
  logEntryScore.value = 0;
  logEntryNote.value = null;
  logModalIsOpen.value = true;
}

async function createCustomLog() {
  const log = await createShiftLog(
    logEntryType.value!,
    mshipID.value!,
    startDateString,
    shift.id,
    logEntryScore.value,
    logEntryNote.value ?? undefined,
  );
  logs.value.push(log);
  logModalIsOpen.value = false;
}

// MEMBERSHIP DATA
type SelectedMembership = Awaited<ReturnType<typeof fetchMship>>;
const mshipData = ref<SelectedMembership | null>(null);
const mshipError = ref<boolean>(false);
const mshipID = ref<number | undefined>(undefined);

watch(mshipID, () => {
  mshipData.value = null;
  mshipError.value = false;
});

async function fetchMship(id: number) {
  return await directus.request(
    readItem("memberships", id, {
      fields: [
        "id",
        { memberships_user: ["first_name", "last_name"] },
        "memberships_type",
        "memberships_status",
        "shifts_categories_allowed",
        "shifts_user_type",
        "shifts_can_be_coordinator",
      ],
    }),
  );
}

async function loadMembership() {
  if (!mshipID.value) {
    mshipError.value = true;
    return;
  }
  try {
    mshipData.value = await fetchMship(mshipID.value);
  } catch (e) {
    console.error(e);
    mshipData.value = null;
    mshipError.value = true;
  }
}

type RequiredFields = {
  id: number;
  memberships_user: {
    first_name: string;
    last_name: string;
  };
};

function displayMembership<T extends RequiredFields>(mship: T) {
  const user = mship.memberships_user;
  return `#${mship.id} ${user.first_name} ${user.last_name}`;
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
    await directus.request(
      deleteItem(
        "shifts_assignments",
        removeAssignmentObject.value.assignment.id!,
      ),
    );
  } else if (onetime) {
    // Create one-time absence for a regular assignment
    await directus.request(
      createItem("shifts_absences", {
        shifts_membership: (
          removeAssignmentObject.value.assignment
            .shifts_membership as MembershipsMembership
        ).id,
        shifts_assignment: removeAssignmentObject.value.assignment.id,
        shifts_is_for_all_assignments: false,
        shifts_from: startDateString,
        shifts_to: startDateString,
        shifts_status: "accepted",
      }),
    );
  } else {
    // Stop regular assignment on the day before
    const startMinusOneDay = new Date();
    startMinusOneDay.setDate(start.getDate() - 1);
    await directus.request(
      updateItem(
        "shifts_assignments",
        removeAssignmentObject.value.assignment.id!,
        {
          shifts_to: startMinusOneDay.toISOString().split("T")[0],
        },
      ),
    );
  }

  // Remove assignment from slot
  removeAssignmentObject.value.removed = true;
  removeAssignmentModalIsOpen.value = false;
  if (removeAssignmentObject.value.assignment.shifts_is_coordination) {
    occ.needsCoordinator = true;
  }
  occ.n_assigned--;
  emit("data-has-changed");
}

// CREATE ASSIGNMENT FLOW
const createAssignmentModalIsOpen = ref(false);
const createAssignmentCoordinator = ref(false);

function startCreateAssignmentFlow() {
  mshipID.value = undefined;
  createAssignmentModalIsOpen.value = true;
  createAssignmentCoordinator.value = false;
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
  const occ = occurrences[0];
  if (occ.n_assigned >= occ.shift.shifts_slots) {
    const m = "Somebody else has just signed up for this shift";
    showToast({
      type: "info",
      description: m,
    });
    emit("data-has-changed");
    throw new Error(m);
  }

  const payload: Partial<ShiftsAssignment> = {
    shifts_membership: mshipID.value,
    shifts_shift: shift.id!,
    shifts_from: startDateString,
    shifts_is_regular: !onetime,
    shifts_is_coordination: createAssignmentCoordinator.value,
  };

  const res = (await directus.request(
    createItem("shifts_assignments", payload, {
      fields: [
        "id",
        "shifts_membership",
        "shifts_is_regular",
        "shifts_is_coordination",
        "shifts_shift",
        "shifts_from",
        "shifts_to",
        {
          shifts_membership: [
            "id",
            { memberships_user: ["first_name", "last_name", "email"] },
          ],
        },
      ],
    }),
  )) as ShiftsAssignment;

  occ.assignments.push({
    assignment: res,
    isActive: true,
    isOneTime: onetime,
    absences: [],
  } as AssignmentOccurrence);

  createAssignmentModalIsOpen.value = false;
  if (createAssignmentCoordinator.value) {
    occ.needsCoordinator = false;
  }

  occ.n_assigned++;
  emit("data-has-changed");
}

function getAssignmentColor(assignment: AssignmentOccurrence) {
  if (!assignment.isActive || assignment.removed) {
    return "bg-gray-100";
  }

  if (assignment.assignment.shifts_is_coordination) {
    return "bg-yellow-100";
  }

  if (assignment.isOneTime) {
    return "bg-green-100";
  }

  return "bg-primary-100";
}

function checkIfMshipInAssignments(mship: number) {
  for (const assignment of occ.assignments) {
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
  <UModal v-model="mainModalIsOpen" :ui="{ width: 'sm:max-w-[1000px]' }">
    <div class="m-10">
      <div class="flex items-center justify-between">
        <h2>
          {{ shift.shifts_name }} <span v-if="isPast">({{ t("past") }})</span>
        </h2>
        <a
          :href="`${runtimeConfig.public.directusUrl}/admin/content/shifts_shift/${shift.id}`"
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

      <!-- Shift slots -->
      <div v-if="!isPast">
        <div class="flex flex-row items-end mb-5">
          <div class="grow">
            <h2>
              {{ t("Assignments") }} [{{ occ.n_assigned }}/{{
                occ.shift.shifts_slots
              }}]
            </h2>
          </div>
          <div class="mb-1">
            <UButton
              :label="t('Create assignment')"
              size="md"
              icon="i-heroicons-plus-16-solid"
              :disabled="occ.n_assigned >= occ.shift.shifts_slots"
              @click="startCreateAssignmentFlow()"
            />
          </div>
        </div>

        <div class="flex flex-col gap-3 my-2">
          <div
            v-if="occ.needsCoordinator"
            class="bg-yellow-100 p-2 rounded-md font-bold"
          >
            {{ t("Shift needs coordinator") }}
          </div>
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
                <span v-if="assignment.assignment.shifts_is_coordination">
                  {{ t("Shift coordination") }}:
                </span>
                {{ displayMembership(assignment.assignment.shifts_membership) }}
              </template>

              <template #bottom-right>
                <div
                  v-if="assignment.isActive && !assignment.removed"
                  class="flex flex-wrap gap-2"
                >
                  <UButton
                    icon="i-heroicons-trash-16-solid"
                    size="sm"
                    :label="t('Remove')"
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
            </ShiftsViewerModalAdminBox>
          </template>
        </div>
      </div>

      <!-- Logs -->
      <div v-if="isPast">
        <h2 class="mb-2 mt-6">{{ t("Logs") }}</h2>
        <template v-for="log of logs" :key="log.id">
          <ShiftsViewerModalAdminBox
            :id="log.id!"
            label="Log"
            collection="shifts_logs"
          >
            <template #header>{{
              displayMembership(log.shifts_membership)
            }}</template>
            <p>{{ t(log.shifts_type) }} ({{ log.shifts_score }})</p>
            <p v-if="log.shifts_note">Notes: {{ log.shifts_note }}</p>
          </ShiftsViewerModalAdminBox>
        </template>
        <div class="mt-3">
          <UButton @click="openLogModal">{{ t("Create log") }}</UButton>
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
          <p>{{ t("Membership type") }}: {{ mshipData.memberships_type }}</p>

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
            <UFormGroup
              v-if="occ.needsCoordinator && mshipData.shifts_can_be_coordinator"
              :label="t('Shift coordinator')"
              name="createShiftCoordinator"
              class="my-5"
            >
              <div class="form-box flex flex-row">
                <UToggle
                  v-model="createAssignmentCoordinator"
                  class="mt-0.5 mr-2"
                />
                <span>{{ t("Assign this person as coordinator") }}</span>
              </div>
            </UFormGroup>
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
            {{ removeAssignmentObject.assignment.shifts_from }} {{ t("to") }}
            {{
              removeAssignmentObject.assignment.shifts_to || t("No end date")
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
    </UModal>

    <UModal v-model="logModalIsOpen" :transition="false">
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
  "Shift coordinator": "Schichtkoordinator*in"
  "Shift coordination": "Schichtkoordination"

  "Required skills": "Benötigte Fähigkeiten"
  "Shift needs coordinator": "Schicht benötigt Koordinator*in"
  "Assign this person as coordinator": "Diese Person als Koordinator*in eintragen"

  Skills: "Fähigkeiten"
  Category: Kategorie
  Member is already assigned  for this shift: "Mitglied ist bereits für diese Schicht angemeldet"
</i18n>
