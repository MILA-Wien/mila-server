<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";

const checkinState = useCheckinState();
const POLL_INTERVAL = 1000; // ms

let timeoutId: NodeJS.Timeout | null = null;

const fetchData = async () => {
  try {
    checkinState.value = await $fetch("/api/checkin/current_state");
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    timeoutId = setTimeout(fetchData, POLL_INTERVAL);
  }
};

onMounted(() => {
  fetchData();
});

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId);
});
</script>

<template>
  <!-- Checkin Stream has been mounted -->
</template>
