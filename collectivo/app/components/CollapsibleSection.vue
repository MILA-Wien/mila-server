<script setup lang="ts">
// A subsection with a clickable heading, collapsed by default.
// Uses native <details>, so it works with the keyboard and without extra state.
defineProps<{ title: string }>();
</script>

<template>
  <details class="group">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden"
    >
      <UIcon
        name="i-heroicons-chevron-right"
        class="size-5 shrink-0 transition-transform group-open:rotate-90"
      />
      <h3 class="text-base my-0">{{ title }}</h3>
    </summary>
    <div class="pt-4">
      <slot />
    </div>
  </details>
</template>
