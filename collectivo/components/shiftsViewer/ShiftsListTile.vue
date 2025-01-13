<script setup lang="ts">
import type { PropType } from "vue";

const emit = defineEmits(["openOccurrence"]);

const { t } = useI18n();
const props = defineProps({
  occurrence: {
    type: Object as PropType<ShiftOccurrenceFrontend>,
    required: true,
  },
  admin: {
    type: Boolean,
    default: false,
  },
});
const occ = props.occurrence;
const allcats = useShiftsCategories().data.value;
const catName = allcats.find(
  (cat) => cat.id === occ.shift.shifts_category_2,
)?.name;
const shift = occ.shift;
const isPast = new Date() > new Date(occ.start.split("T")[0]);
const isOpen =
  props.occurrence.n_assigned < props.occurrence.shift.shifts_slots;

let shiftTitle = "";
if (shift.shifts_from_time && shift.shifts_to_time) {
  shiftTitle =
    shift.shifts_from_time.slice(0, 5) +
    " - " +
    shift.shifts_to_time.slice(0, 5);
} else {
  shiftTitle = t("All day");
}
shiftTitle += " (" + shift.shifts_name + ")";
</script>

<template>
  <div
    class="w-full bg-gray-50 p-2 flex flex-wrap justify-between items-start gap-2"
  >
    <div class="w-2/3">
      <div class="font-bold">{{ shiftTitle }}</div>

      <div v-if="shift.shifts_category_2">
        {{ t("Category") }}: {{ catName }}
      </div>

      <!-- Assignments -->
      <span
        >{{ occ.n_assigned }}/{{ shift.shifts_slots }} {{ t("assignments") }}
      </span>
      <span v-if="occ.n_assigned > 0">: </span>
      <span
        v-for="assignment in occ.assignments"
        :key="assignment.assignment.id"
      >
        <span v-if="assignment.isActive">
          {{
            assignment.assignment.shifts_membership.memberships_user.first_name
          }}
          {{
            assignment.assignment.shifts_membership.memberships_user.last_name
          }}
        </span>
      </span>
    </div>
    <!-- Space for buttons -->
    <div class="flex flex-wrap gap-2">
      <UButton
        v-if="!admin && isOpen"
        size="sm"
        @click="emit('openOccurrence', occ)"
        >{{ t("Sign up") }}
      </UButton>
      <UButton
        v-if="admin && isOpen && !isPast"
        size="sm"
        disabled
        color="orange"
        >{{ t("Unfilled") }}
      </UButton>
      <UButton v-if="admin && isPast" size="sm" disabled color="blue"
        >{{ t("Past") }}
      </UButton>
      <UButton
        v-if="admin && isPast"
        size="sm"
        @click="emit('openOccurrence', occ)"
        >{{ t("Logs") }}
      </UButton>
      <UButton
        v-if="admin && !isPast"
        size="sm"
        @click="emit('openOccurrence', occ)"
        >{{ t("Assignments") }}
      </UButton>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  assignments: Anmeldungen
  Category: Kategorie
  Past: Vergangen
  Unfilled: Unbesetzt
  Logs: Logs
  Assignments: Anmeldungen
  Sign up: Anmelden
  All day: Ganztägig
</i18n>
