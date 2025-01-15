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

const runtimeConfig = useRuntimeConfig();
</script>

<template>
  <div class="flex flex-col w-full p-2 mb-2 bg-gray-100">
    <div class="flex flex-row">
      <div class="grow">
        <p class="font-bold"><slot name="header" /></p>
      </div>
      <div>
        <a
          :href="`${runtimeConfig.public.directusUrl}/admin/content/${collection}/${id}`"
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
