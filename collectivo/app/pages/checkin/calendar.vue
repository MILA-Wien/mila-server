<script setup lang="ts">
setPageLayout("checkin");
definePageMeta({
  middleware: ["auth"],
});
const checkinState = useCheckinState();
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
  <div
    class="border-2 border-black p-4 w-full mb-8 flex flex-row justify-between font-bold"
  >
    <div>
      <div>MILA Checkin Schichtkalender</div>
      <div>
        Für Mitglied:
        <span v-if="checkinState.username"
          >#{{ checkinState.membership }} {{ checkinState.username }}</span
        ><span v-else>Kein Mitglied ausgewählt</span>
      </div>
    </div>
    <UButton class="border-2" :to="{ path: '/checkin' }" variant="outline"
      >Zurück zum Checkin</UButton
    >
  </div>
  <ShiftsViewer
    v-if="checkinState.username"
    :mshipId="checkinState.membership"
  />
</template>
