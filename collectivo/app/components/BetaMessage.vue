<script setup lang="ts">
const user = useCurrentUser();

if (!user.value.isStudioAdmin) {
  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
    fatal: true,
  });
}
</script>

<template>
  <div class="p-4 bg-black text-white font-bold mb-4">
    BETA: Dieser Bereich ist für normale Mitglieder noch nicht zugänglich.
  </div>
</template>
