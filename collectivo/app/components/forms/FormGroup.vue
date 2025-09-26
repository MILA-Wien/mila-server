<script setup lang="ts">
import type { PropType } from "vue";
import { required } from "zod/v4-mini";

const props = defineProps({
  name: {
    type: String as PropType<string>,
    required: true,
  },
  required: {
    type: Boolean as PropType<boolean>,
    required: false,
    default: false,
  },
  label: {
    type: String as PropType<string>,
    required: false,
    default: undefined,
  },
  infotext: {
    type: String as PropType<string>,
    required: false,
    default: undefined,
  },
});
</script>

<template>
  <UFormGroup :name="props.name">
    <div class="font-bold inline-flex items-start">
      <template v-if="props.label">{{ props.label }}</template>
      <slot name="title"></slot>
      <span v-if="props.required" class="text-red-600 ml-1">*</span>
      <UPopover v-if="infotext" class="ml-1 z-50">
        <UButton
          variant="ghost"
          class="m-0! p-0! leading-none"
          size="md"
          color="white"
        >
          <UIcon
            name="i-heroicons-question-mark-circle"
            class="text-[1em] h-6 w-6"
          />
        </UButton>

        <template #panel>
          <div class="p-4 w-72 font-normal text-sm">
            {{ infotext }}
          </div>
        </template>
      </UPopover>
    </div>
    <div class="mt-1 mb-2">
      <slot name="description"></slot>
    </div>
    <slot></slot>
  </UFormGroup>
</template>
