<script setup lang="ts">
const _ = defineProps({
  title: {
    type: String,
    default: "",
  },
  color: {
    type: String,
    default: "green",
  },
});
</script>
<!-- TODO: Implement colors again -->
<!-- bg-${color ?? 'primary'}-50 -->
<template>
  <div
    class="px-6 py-4 h-fit w-full border-l-[5px] border-milaGreen relative overflow-hidden inline-block"
  >
    <h3 v-if="title" class="font-Avory">
      {{ title }}
    </h3>
    <slot />
  </div>
</template>

<style lang="scss" scoped></style>
