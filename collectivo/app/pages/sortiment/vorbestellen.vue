<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
  layout: false,
});

const config = useRuntimeConfig();
</script>

<template>
  <div class="iframe-container">
    <iframe
      :src="config.public.lotzappShopUrl"
      title="MILA Sortiment Aktuell"
      class="iframe"
    />
  </div>
</template>

<style scoped>
.iframe-container {
  width: 100%;
  height: 100vh;
}

.iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
