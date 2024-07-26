<script setup lang="ts">
defineProps({
  collection: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  id: {
    type: Number,
    required: true,
  },
});
</script>

<template>
  <div class="flex flex-col w-full rounded-md p-3">
    <div class="flex flex-row mb-2">
      <div class="grow">
        <h5><slot name="header" /></h5>
      </div>
      <div>
        <a
          :href="`http://localhost:8055/admin/content/${collection}/${id}`"
          target="blank"
          class="flex flex-row items-center align-middle text-xs gap-1"
        >
          <span class="text-xs">{{ label }} {{ id }}</span>
          <UIcon name="i-heroicons-arrow-top-right-on-square-16-solid" />
        </a>
      </div>
    </div>

    <div class="flex flex-row">
      <div class="grow">
        <slot />
      </div>
      <div class="mt-auto">
        <slot name="bottom-right" />
      </div>
    </div>
  </div>
</template>
