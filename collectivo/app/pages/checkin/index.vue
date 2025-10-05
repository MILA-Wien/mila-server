<script setup lang="ts">
setPageLayout("checkin");
definePageMeta({
  middleware: ["auth"],
});
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
  <div class="flex flex-row justify-center mt-48">
    <div class="w-128">
      <h1>MILA Checkin</h1>
      <CheckinCardScanner />

      <CheckinManualInput />
    </div>
  </div>
</template>
