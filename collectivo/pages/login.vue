<script setup lang="ts">
// If user is not authenticated, log out of directus and redirect to keycloak

definePageMeta({
  layout: false,
});

const directus = useDirectus();
const runtimeConfig = useRuntimeConfig();

directus.logout();

navigateTo(
  `${runtimeConfig.public.directusUrl}/auth/login/keycloak?redirect=${runtimeConfig.public.collectivoUrl}`,
  { external: true },
);
</script>
