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
  errorMessage.value = "";
  try {
    await directus.login(email, password);
    // Nuxt navigateTo does not work in this context, don't know why
    window.location.href = runtimeConfig.public.collectivoUrl;
  } catch (error) {
    errorMessage.value =
      "Login failed. User may not exist. Have you clicked 'Seed Example Data' yet?";
  } finally {
    loading.value = false;
  }
}

async function handleLogin() {
  await loginDevMode(email.value, password.value);
}

async function seedData() {
  seeding.value = true;
  try {
    await $fetch("/api/create_example_data", {
      method: "POST",
      headers: {
        Authorization: "badToken",
      },
    });
    alert("Data seed started. See terminal for more info.");
  } catch (error) {
    alert("Error seeding data: " + error);
  } finally {
    seeding.value = false;
  }
}

const TEST_USERS: [string, string][] = [
  ["admin@example.com", "admin"],
  ["editor@example.com", "editor"],
  ["user@example.com", "user"],
  ["checkin@mila.wien", "checkin"],
];

const loading = ref(false);
const seeding = ref(false);
const email = ref("admin@example.com");
const password = ref("admin");
const errorMessage = ref("");
</script>

<template>
  <div
    v-if="!useKeycloak"
    class="flex flex-col items-center justify-center h-screen gap-6"
  >
    <h1 class="text-2xl font-bold">LOGIN DEV MODE</h1>

    <form @submit.prevent="handleLogin" class="flex flex-col gap-4 w-80">
      <div class="flex flex-col gap-2">
        <label for="email" class="text-sm font-medium">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="password" class="text-sm font-medium">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <UButton type="submit" :loading="loading" class="mt-2"> Login </UButton>
    </form>

    <div v-if="errorMessage" class="w-80 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
      {{ errorMessage }}
    </div>

    <div class="flex flex-col gap-3 w-80">
      <div class="border-t border-gray-300 pt-4">
        <h2 class="text-sm font-medium mb-3 text-center">Quick Login</h2>
        <div class="flex flex-col gap-2">
          <template v-for="user in TEST_USERS" :key="user[0]">
            <UButton
              :loading="loading"
              @click="loginDevMode(user[0], user[1])"
              variant="outline"
              size="sm"
            >
              Log in as {{ user[0] }}
            </UButton>
          </template>
        </div>
      </div>

      <div class="border-t border-gray-300 pt-4">
        <UButton :loading="seeding" @click="seedData" color="green" block>
          Seed Example Data
        </UButton>
      </div>
    </div>
  </div>
</template>
