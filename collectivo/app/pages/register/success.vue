<script setup lang="ts">
const { t } = useI18n();
const user = useCurrentUser();

setPageTitle(t("Membership Application"));

definePageMeta({
  layout: "forms",
});
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-6">
    <UIcon
      name="i-heroicons-check-16-solid"
      class="w-[64px] h-[64px] text-primary"
    />
    <h1 class="text-center">
      {{ t("Application submitted!") }}
    </h1>
    <div
      v-if="user.isAuthenticated"
      class="flex flex-col items-center justify-center space-y-6"
    >
      <NuxtLink to="/">
        <UButton size="md">{{ t("Home") }}</UButton>
      </NuxtLink>
    </div>
    <div v-else class="flex flex-col items-center justify-center space-y-6">
      <p class="text-center">
        {{ t("t:memberships_form_success") }}
      </p>
      <UButton
        icon="i-heroicons-arrow-right-end-on-rectangle-16-solid"
        size="md"
        @click="user.login()"
        >{{ t("Login") }}</UButton
      >
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  "Membership Application": "Beitrittserklärung"
  "Application submitted!": "Antrag erfolgreich eingereicht!"
  "Home": "Startseite"
  "Login": "Anmelden"
  "t:memberships_form_success": "Bitte melde dich an, um deine E-Mail Adresse zu bestätigen."
  "t:memberships_form_already_member": "Deine Beitrittserklärung wurde erfolgreich abgesendet. Vielen Dank für deine Anmeldung!"

en:
  "Application submitted!": "Application submitted!"
  "Home": "Home"
  "Login": "Login"
  "t:memberships_form_success": "Please log in to confirm your email address."
  "t:memberships_form_already_member": "Your membership application has been successfully submitted. Thank you for joining!"
</i18n>
