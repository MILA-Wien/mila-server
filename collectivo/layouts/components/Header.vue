<script setup lang="ts">
const pageTitle = usePageTitle();
const backLink = usePageBackLink();
const backLinkLabel = usePageBackLinkLabel();
</script>

<template>
  <div class="hidden md:flex justify-between items-start mb-7 lg:mb-11">
    <div>
      <h1
        class="flex flex-wrap text-4xl lg:text-5xl align-middle items-center gap-3 mt-0"
      >
        {{ pageTitle }}
      </h1>
      <NuxtLink
        v-if="backLink"
        :to="backLink"
        class="flex flex-row gap-1 items-center text-base"
      >
        <UIcon name="i-heroicons-arrow-left-16-solid" />
        <span> {{ backLinkLabel }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
