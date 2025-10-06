<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";

const checkinState = useCheckinState();

let checkinStream: EventSource | null = null;

onMounted(() => {
  checkinStream = new EventSource("/api/checkin/stream");
  checkinStream.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      checkinState.value = data;
    } catch (err) {
      console.error("Failed to read card id:", err);
    }
  };
  checkinStream.onerror = (err) => {
    console.warn("Lost SSE connectionsssdasdsasd, retrying soon...", err);
  };
});

onBeforeUnmount(() => {
  checkinStream?.close();
});
</script>

<template>
  <!-- Checkin Stream has been mounted -->
</template>
