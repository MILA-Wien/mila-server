<script setup lang="ts">
const { t } = useI18n();
const props = defineProps({
  occurrence: {
    type: Object as PropType<ShiftOccurrenceResponse>,
    required: true,
  },
  admin: {
    type: Boolean,
    default: false,
  },
});
const occ = props.occurrence;
const shift = occ.shift;
const activeAssignments = occ.assignments.filter((a) => a.isActive);
</script>

<template>
  <div>
    <span
      >{{ occ.n_assigned }}/{{ shift.shifts_slots }} {{ t("assignments") }}
    </span>
    <span v-if="occ.n_assigned > 0">: </span>
    <span
      v-for="(assignment, index) in activeAssignments"
      :key="assignment.assignmentId"
    >
      {{
        assignment.username === ""
          ? "Anonym"
          : assignment.username +
            " " +
            (assignment.username_last ?? "")
      }}<span v-if="assignment.skills?.length">{{ ' ' }}<span
        v-for="skill in assignment.skills"
        :key="skill.icon"
      >{{ skill.icon }}</span></span><span v-if="index < activeAssignments.length - 1">, </span>
    </span>
  </div>
</template>

<i18n lang="yaml">
de:
  assignments: Anmeldungen
</i18n>
