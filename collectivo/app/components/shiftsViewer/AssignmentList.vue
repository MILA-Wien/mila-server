<script setup lang="ts">
type OccurrencesResponse = Awaited<ReturnType<typeof getOccurrencesAdmin>>;
type Occurrence = OccurrencesResponse["occurrences"][number];
const { t } = useI18n();
const props = defineProps({
  occurrence: {
    type: Object as PropType<Occurrence>,
    required: true,
  },
});
const occ = props.occurrence;
const shift = occ.shift;
</script>

<template>
  <div>
    <span
      >{{ occ.n_assigned }}/{{ shift.shifts_slots }} {{ t("assignments") }}
    </span>
    <span v-if="occ.n_assigned > 0">: </span>
    <span
      v-for="(assignment, index) in occ.assignments"
      :key="assignment.assignment.id"
    >
      <span v-if="assignment.isActive">
        {{
          assignment.assignment.shifts_membership.memberships_user.username ===
          ""
            ? "Anonym"
            : assignment.assignment.shifts_membership.memberships_user.username
        }}
        <span
          v-if="
            assignment.assignment.shifts_membership.shifts_can_be_coordinator
          "
        >
          ({{ t("Coordinator") }})</span
        ><span v-if="index < occ.n_assigned - 1">, </span>
      </span>
    </span>
  </div>
</template>

<i18n lang="yaml">
de:
  assignments: Anmeldungen
  Coordinator: Koordinator*in
</i18n>
