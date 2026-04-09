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
</script>

<template>
  <div>
    <span
      >{{ occ.n_assigned }}/{{ shift.shifts_slots }} {{ t("assignments") }}
    </span>
    <span v-if="occ.n_assigned > 0">: </span>
    <span
      v-for="(assignment, index) in occ.assignments"
      :key="assignment.assignmentId"
    >
      <span v-if="assignment.isActive">
        {{
          assignment.username === ""
            ? "Anonym"
            : assignment.username +
              " " +
              (assignment.username_last ?? "")
        }}
        <span
          v-for="skill in assignment.skills"
          :key="skill.icon"
        >{{ skill.icon }}</span
        ><span v-if="index < occ.n_assigned - 1">, </span>
      </span>
    </span>
  </div>
</template>

<i18n lang="yaml">
de:
  assignments: Anmeldungen
</i18n>
