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
<!-- bg-${color ?? 'primary'}-50 -->
<template>
  <div class="px-6 py-4 border-l-[5px] border-milaGreen">
    <h3 v-if="title" class="font-Avory">
      {{ title }}
    </h3>
    <slot name="content" />
  </div>
</template>

<style lang="scss" scoped>
.card {
  @apply h-fit w-full rounded-[15px] relative overflow-hidden p-6 inline-block;
  &__title {
    @apply mb-1 font-semibold text-lg leading-[22px];
  }

  .card-corner {
    @apply h-[70px] w-[70px] absolute rounded-full right-0 top-0 transform translate-x-2/4 -translate-y-2/4 mt-2 mr-2;
  }
}
</style>
