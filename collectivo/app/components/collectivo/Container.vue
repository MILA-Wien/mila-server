<script setup lang="ts">
const _ = defineProps({
  color: {
    type: String,
  },
});
</script>

<template>
  <div :class="`cv-container bg-${color ? color + '-100' : 'white'}`">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.cv-container {
  @apply w-full rounded-xl p-[25px] mb-5;
  box-shadow: 0px 6px 48px 0px rgba(220, 226, 239, 0.5);
}
</style>
