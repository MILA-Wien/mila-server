<script setup lang="ts">
import type { PropType } from "vue";
import { parse } from "marked";
const { t } = useI18n();
const props = defineProps({
  occurrence: {
    type: Object as PropType<ShiftOccurrenceFrontend>,
    required: true,
  },
});
const occ = props.occurrence;
const shift = occ.shift;
const isOpen =
  props.occurrence.n_assigned < props.occurrence.shift.shifts_slots;

let shiftTitle = "";
if (shift.shifts_from_time && shift.shifts_to_time) {
  shiftTitle =
    shift.shifts_from_time.slice(0, 5) +
    " - " +
    shift.shifts_to_time.slice(0, 5) +
    " - ";
}
shiftTitle += shift.shifts_name;
</script>

<template>
  <CollectivoCard :title="shiftTitle" :color="isOpen ? 'primary' : 'green'">
    <div>{{ t("Category") }}: {{ shift.shifts_category_2 }}</div>

    <!-- Assignments -->
    <span
      >{{ occ.n_assigned }}/{{ shift.shifts_slots }} {{ t("assignments") }}
    </span>
    <span v-if="occ.n_assigned > 0">: </span>
    <span v-for="assignment in occ.assignments" :key="assignment.assignment.id">
      <span v-if="assignment.isActive">
        {{
          assignment.assignment.shifts_membership.memberships_user.first_name
        }}
        {{ assignment.assignment.shifts_membership.memberships_user.last_name }}
      </span>
    </span>

    <!-- Space for buttons -->
    <div class="flex flex-wrap gap-3 pt-4">
      <UButton v-if="isOpen" size="sm" @click="">{{ t("Sign up") }} </UButton>
    </div>
  </CollectivoCard>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  assignments: Anmeldungen
  Category: Kategorie
</i18n>
