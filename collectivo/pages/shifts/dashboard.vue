<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const config = useRuntimeConfig();

const { t } = useI18n();
setCollectivoTitle(t("Shifts"));

const user = useCollectivoUser().value.user!;
const mship = useCollectivoUser().value.membership!;
const isActive = mship.shifts_user_type != "inactive";
const activeAssignments: Ref<ShiftsAssignmentRules[]> = ref([]);

async function loadData() {
  activeAssignments.value = await getActiveAssignments(user);
}

if (isActive) loadData();
</script>

<template>
  <div v-if="!isActive">
    <p>
      {{ t("Shift system has not been activated for this account.") }}
    </p>
  </div>
  <div v-else>
    <CollectivoContainer>
      <div>
        <p>{{ t("Membership number") }}: {{ mship.id }}</p>
        <p>{{ t("Name") }}: {{ user.first_name + " " + user.last_name }}</p>
        <p>{{ t("Shifttype") }}: {{ t("t:" + mship.shifts_user_type) }}</p>

        <!-- <p>
          <span>{{ t("Skills") }}: </span>
          <span v-if="!mship.shifts_skills.length">{{ t("None") }}</span>
          <span v-for="(skill, index) in mship.shifts_skills" :key="skill.id">
            <span v-if="index !== 0">, </span>
            <span>{{ skill.shifts_skills_id.shifts_name }}</span>
          </span>
        </p> -->

        <p v-if="mship.shifts_user_type != 'exempt'">
          {{ t("Shiftcounter") }}: {{ mship.shifts_counter }}
        </p>
      </div>
    </CollectivoContainer>

    <div v-if="isActive" class="flex flex-wrap pb-6 gap-5">
      <template v-if="true">
        <NuxtLink to="/shifts/signup-jumper"
          ><UButton size="lg" icon="i-heroicons-plus-circle">{{
            t("Sign up for a one-time shift")
          }}</UButton>
        </NuxtLink>
      </template>
      <!-- <NuxtLink to="/shifts/signup"
        ><UButton size="lg" icon="i-heroicons-plus-circle">{{
          t("Sign up for a shift")
        }}</UButton></NuxtLink
      > -->
      <a :href="`mailto:${config.public.collectivoContactEmail}`">
        <UButton
          size="lg"
          :label="t('Request change')"
          :icon="'i-heroicons-pencil-square'"
        />
      </a>
    </div>

    <h2>{{ t("My shifts") }}</h2>
    <p v-if="!activeAssignments.length">
      {{ t("No upcoming shifts") }}
    </p>
    <div class="flex flex-col gap-4 my-4">
      <ShiftsAssignmentCard
        v-for="assignment in activeAssignments"
        :key="assignment.assignment.id"
        :shift-assignment="assignment"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  "Membership number": "Mitgliedsnummer"
  "Shifttype": "Schichttyp"
  "Shiftcounter": "Schichtzähler"
  "Request change": "Änderung beantragen"
  "t:shift_status_good": "Gut!"
  "t:shift_status_bad": "Du musst Schichten nachholen"
  "t:shift_status_exempt": "Du bist von Schichten befreit"
  "Choose shift type": "Schichttyp wählen"
  "Shifts": "Schichten"
  "My shifts": "Meine Schichten"
  "Upcoming shifts": "Kommende Schichten"
  "No upcoming shifts": "Keine kommenden Schichten"
  "shifts": "Schichten"
  "shift": "Schicht"
  "ahead": "voraus"
  "to catch up": "nachzuholen"
  "Skills": "Fähigkeiten"
  "Sign up for a shift": "Neue Schicht eintragen"
  "t:regular": "Regulär"
  "t:jumper": "Springer*in"
  "t:exempt": "Befreit"
  "t:inactive": "Nicht aktiv"
  "None": "Keine"
  "My activities": "Meine Aktivitäten"
  "Sign up for a one-time shift": "Einmalige Schicht eintragen"
</i18n>
