<script setup lang="ts">
import type { ShiftLogsAdmin } from "~/composables";

const props = defineProps({
  logs: {
    type: Array as PropType<ShiftLogsAdmin[]>,
    required: true,
  },
  occurence: {
    type: Object as PropType<ShiftOccurrence>,
    required: true,
  },
});

async function removeLog(logID: number) {
  await deleteShiftLogsAdmin(logID);
  writableLogs.value = writableLogs.value.filter((l) => l.id !== logID);
}

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

const writableLogs = ref([...props.logs]);
const logEntryOptions = ["attended", "missed", "other"];
const logModalIsOpen = ref(false);
const logEntryType = ref<string | null>(null);
const logEntryScore = ref(0);
const logEntryNote = ref<string | null>(null);
const occ = props.occurence;
const shift = occ.shift;
const start = new Date(occ.start);
const startDateString = start.toISOString().split("T")[0];
const { t } = useI18n();

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
  writableLogs.value.push(log);
  logModalIsOpen.value = false;
}
</script>

<template>
  <h2 class="mb-2 mt-6">Extra logs (Ohne Anmeldung)</h2>
  <template v-for="log of writableLogs" :key="log.id">
    <ShiftsViewerModalAdminBox
      :id="log.id!"
      label="Log"
      collection="shifts_logs"
    >
      <template #header>{{
        displayMembership(log.shifts_membership)
      }}</template>
      <p>{{ t("t:" + log.shifts_type) }} ({{ log.shifts_score }})</p>
      <p v-if="log.shifts_note">Notes: {{ log.shifts_note }}</p>
      <template #bottom-right>
        <UButton size="sm" color="gray" @click="removeLog(log.id)">
          {{ t("Remove") }}
        </UButton>
      </template>
    </ShiftsViewerModalAdminBox>
  </template>
  <div class="mt-3">
    <UButton @click="openLogModal">Extra log erstellen</UButton>
  </div>

  <UModal v-model:open="logModalIsOpen" :transition="false">
    <template #content>
      <div class="p-10 flex flex-col gap-4">
        <h2>{{ t("Create log entry") }}</h2>
        <UFormGroup :label="t('Membership number')" name="membershipID">
          <UInput v-model="mshipID" />
        </UFormGroup>
        <UButton @click="loadMembership">{{ t("Load membership") }}</UButton>

        <div v-if="mshipData">
          <p class="font-bold">
            {{ mshipData.memberships_user.username }}
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
    </template>
  </UModal>
</template>

<i18n lang="yaml">
de:
  "t:attended_draft": "Entwurf"
  "t:attended": "Absolviert"
  "t:missed": "Verpasst"
  "t:other": "Sonstiges"
</i18n>
