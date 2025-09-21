<script setup lang="ts">
import type { PropType } from "vue";

const model = defineModel<boolean>(); // boolean v-model
</script>

<template>
  <div
    class="p-3 flex flex-row gap-3 border-2 cursor-pointer transition-colors"
    :class="
      model
        ? 'border-primary bg-primary-50'
        : 'border-black hover:border-primary'
    "
    @click="model = !model"
  >
    <UCheckbox v-model="model" />

    <div class="-mt-1">
      <slot></slot>
    </div>
  </div>
</template>
