<script setup lang="ts">
setCollectivoTitle("Sign up for a shift", { backLink: "profile" });

definePageMeta({
  middleware: ["auth"],
});

const user = useCollectivoUser();
</script>

<template>
  <CollectivoContainer v-if="user.membership?.shifts_user_type">
    <ShiftsCalendar :shift-type="user.membership.shifts_user_type" />
  </CollectivoContainer>
</template>
