<script setup lang="ts">
import Keycloak from "keycloak-js";

definePageMeta({
  layout: false,
});

const directus = useDirectus();
const config = useRuntimeConfig();

try {
  await directus.logout();
} catch (error) {
  console.error("Failed to log out from Directus:", error);
}

const debug = useRuntimeConfig().public.debug;

if (debug) {
  console.log("Debug mode enabled, skipping Keycloak logout");
  await navigateTo("/login");
} else {
  try {
    const keycloak = new Keycloak({
      url: config.public.keycloakUrl,
      realm: config.public.keycloakRealm,
      clientId: config.public.keycloakClient,
    });

    await keycloak.init({
      onLoad: "check-sso",
      redirectUri: config.public.collectivoUrl + "/logout",
    });

    await keycloak.logout({
      redirectUri: config.public.collectivoUrl,
    });
  } catch (error) {
    console.error("Failed to log out from Keycloak:", error);
  }
}
</script>

<template>
  <div />
</template>
