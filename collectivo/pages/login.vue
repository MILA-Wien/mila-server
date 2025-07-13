<script setup lang="ts">
// If user is not authenticated, log out of directus and redirect to keycloak
// In local debug mode, keycloak is not used, so we log in directly to Directus

definePageMeta({
  layout: false,
});

const directus = useDirectus();
const runtimeConfig = useRuntimeConfig();

const debug = useRuntimeConfig().public.debug;

if (!debug) {
  directus.logout();
  navigateTo(
    `${runtimeConfig.public.directusUrl}/auth/login/keycloak?redirect=${runtimeConfig.public.collectivoUrl}`,
    { external: true },
  );
}

async function logInDebug(email: string, password: string) {
  loading.value = true;
  console.log(`Logging in as ${email} with password ${password}`);
  await directus.login(email, password);
  console.log("Login successful, redirecting to home page");
  console.log("Redirected to home page");
  window.location.href = "http://localhost:3000";
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
    v-if="debug"
    class="flex flex-col items-center justify-center h-screen gap-3"
  >
    <h1>LOGIN DEBUG MODE</h1>
    <template v-for="[email, password] in TEST_USERS" :key="email">
      <UButton :loading="loading" @click="logInDebug(email, password)">
        Log in as {{ email }}
      </UButton>
    </template>
  </div>
</template>
