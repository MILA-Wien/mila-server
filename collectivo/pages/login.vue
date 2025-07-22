<script setup lang="ts">
// If user is not authenticated, log out of directus and redirect to keycloak
// In local dev mode, keycloak is not used, so we log in directly to Directus

definePageMeta({
  layout: false,
});

const directus = useDirectus();
const runtimeConfig = useRuntimeConfig();
const useKeycloak = runtimeConfig.public.useKeycloak;

if (useKeycloak) {
  directus.logout();
  navigateTo(
    `${runtimeConfig.public.directusUrl}/auth/login/keycloak?redirect=${runtimeConfig.public.collectivoUrl}`,
    { external: true },
  );
}

async function loginDevMode(email: string, password: string) {
  loading.value = true;
  await directus.login(email, password);
  // Nuxt navigateTo does not work in this context, don't know why
  window.location.href = runtimeConfig.public.collectivoUrl;
}

const TEST_USERS = [
  ["admin@example.com", "admin"],
  ["editor@example.com", "editor"],
  ["user@example.com", "user"],
];

const loading = ref(false);
</script>

<template>
  <div
    v-if="!useKeycloak"
    class="flex flex-col items-center justify-center h-screen gap-3"
  >
    <h1>LOGIN DEV MODE</h1>
    <template v-for="[email, password] in TEST_USERS" :key="email">
      <UButton :loading="loading" @click="loginDevMode(email, password)">
        Log in as {{ email }}
      </UButton>
    </template>
  </div>
</template>
