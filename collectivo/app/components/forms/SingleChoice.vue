<script setup lang="ts">
import type { PropType } from "vue";

const model = defineModel<string>(); // holds the selected option value

const props = defineProps({
  options: {
    type: Array as PropType<{ value: string; label: string }[]>,
    required: true,
  },
});

function toggle(value: string) {
  if (model.value === value) {
    model.value = ""; // allow unselect
  } else {
    model.value = value;
  }
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="opt in props.options"
      :key="opt.value"
      class="p-3 flex flex-row gap-3 border-2 cursor-pointer transition-colors"
      :class="
        model === opt.value
          ? 'border-primary bg-primary-50'
          : 'border-black hover:border-primary'
      "
      @click="toggle(opt.value)"
    >
      <UCheckbox
        :model-value="model === opt.value"
        onUpdate:model-value="toggle(opt.value)"
        class=""
      />

      <div class="-mt-0.5">
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>
