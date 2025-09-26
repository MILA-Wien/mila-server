<script setup lang="ts">
const model = defineModel<boolean>();
</script>

<template>
  <div
    class="p-3 flex flex-row gap-3 border-2 cursor-pointer transition-colors min-h-50"
    :class="
      model
        ? 'border-primary bg-primary-50'
        : 'border-black hover:border-primary'
    "
    @click="model = !model"
  >
    <UCheckbox v-model="model" />

    <div class="-mt-0.5">
      <slot></slot>
    </div>
  </div>
</template>
