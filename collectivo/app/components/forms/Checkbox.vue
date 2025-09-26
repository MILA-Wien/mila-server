<script setup lang="ts">
const model = defineModel<boolean>();
</script>

<template>
  <div
    class="p-3.5 flex flex-row gap-3 border cursor-pointer transition-colors min-h-12"
    :class="
      model
        ? 'border-primary bg-primary-50'
        : 'border-black hover:border-primary'
    "
    @click="model = !model"
  >
    <UCheckbox v-model="model" @click.stop />

    <div class="-mt-0.5">
      <slot></slot>
    </div>
  </div>
</template>
