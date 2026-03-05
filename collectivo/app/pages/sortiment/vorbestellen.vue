<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
  layout: false,
});

const config = useRuntimeConfig();

onMounted(() => {
  window.location.href = config.public.lotzappShopUrl;
});
</script>

<template></template>
