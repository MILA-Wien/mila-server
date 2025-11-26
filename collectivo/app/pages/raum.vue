<template>
  <div>
    <p>Redirecting...</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
  layout: false,
});

const config = useRuntimeConfig();

onMounted(() => {
  if (config.public.annyLoginUrl) {
    window.location.href = config.public.annyLoginUrl;
  }
});
</script>
