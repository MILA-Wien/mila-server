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
<template>
  <div
    :class="`px-5 py-4 h-fit w-full border-2 border-${color}-500 relative overflow-hidden inline-block bg-${color}-50`"
  >
    <h3 v-if="title" class="font-Avory">
      {{ title }}
    </h3>
    <div :class="$attrs.class"><slot /></div>
  </div>
</template>

<style lang="scss" scoped></style>
