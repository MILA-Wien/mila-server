<script setup lang="ts">
const props = defineProps({
  adminOnly: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
});
const user = useCurrentUser();
const { t } = useI18n();

if (props.adminOnly && !user.value.isStudioAdmin) {
  throw createError({
    statusCode: 403,
    statusMessage: "Forbidden",
    fatal: true,
  });
}
</script>

<template>
  <div class="p-4 bg-black text-white font-bold mb-4">
    {{ t("Beta Message") }}
    <a href="mailto:mitmachen@mila.wien" class="underline"
      >mitmachen@mila.wien</a
    >.
  </div>
</template>

<i18n lang="yaml">
de:
  Beta Message: "BETA: Dieser Bereich ist in der Testphase. Feedback bitte an"
en:
  Beta Message: "BETA: This area is in the testing phase. Please send feedback to"
</i18n>
