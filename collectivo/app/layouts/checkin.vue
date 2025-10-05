<script setup lang="ts">
const user = useCurrentUser();
if (user.value?.user.email !== "checkin@mila.wien") {
  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
    fatal: true,
  });
}
</script>

<template>
  <div class="m-8">
    <h1>MILA Checkin</h1>
    <CheckinCardScanner />
    <slot />
  </div>
</template>
