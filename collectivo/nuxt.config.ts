// Main configuration file
// https://nuxt.com/docs/api/configuration/nuxt-config

// Runtimeconfig is overwritten by environment variables
// In dev mode, variables are loaded from .env file using process.env and dotenv
// In production, variables are loaded from docker-compose file
// https://nuxt.com/docs/4.x/guide/going-further/runtime-config

export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,

  routeRules: {
    "/mitglied-werden": { redirect: "/register" },
    "/memberships/register": { redirect: "/register" },
    "/shifts/dashboard": { redirect: "/shifts" },
  },

  runtimeConfig: {
    apiToken: process.env.COLLECTIVO_API_TOKEN || "badToken",
    checkinToken: process.env.COLLECTIVO_CHECKIN_TOKEN || "badCheckinToken",

    directusAdminEmail:
      process.env.DIRECTUS_ADMIN_EMAIL || "directus-admin@example.com",
    directusAdminPassword: process.env.DIRECTUS_ADMIN_PASSWORD || "admin",
    directusAdminToken: process.env.DIRECTUS_ADMIN_TOKEN || "badToken123",

    keycloakAdminClient: process.env.KEYCLOAK_ADMIN_CLIENT || "admin-cli",
    keycloakAdminSecret: process.env.KEYCLOAK_ADMIN_SECRET || "**********",

    emailFrom: process.env.EMAIL_FROM || "",
    emailSmtpHost: process.env.EMAIL_SMTP_HOST || "",
    emailSmtpPort: process.env.EMAIL_SMTP_PORT || "",
    emailSmtpUser: process.env.EMAIL_SMTP_USER || "",
    emailSmtpPassword: process.env.EMAIL_SMTP_PASSWORD || "",

    lotzappMandant: process.env.LOTZAPP_MANDANT || "",
    lotzappAccountIds: process.env.LOTZAPP_ACCOUNT_IDS || "",
    lotzappSepaId: process.env.LOTZAPP_SEPA_ID || "",
    lotzappTransferId: process.env.LOTZAPP_TRANSFER_ID || "",
    lotzappUser: process.env.LOTZAPP_USER || "",
    lotzappPassword: process.env.LOTZAPP_PASSWORD || "",

    public: {
      useKeycloak: process.env.USE_KEYCLOAK === "true" || false,

      collectivoUrl: process.env.COLLECTIVO_URL || "http://localhost:3000",
      contactEmail: process.env.COLLECTIVO_CONTACT_EMAIL || "info@example.com",

      keycloakUrl: process.env.KEYCLOAK_URL || "http://keycloak:8080",
      keycloakRealm: process.env.KEYCLOAK_REALM || "collectivo",
      keycloakClient: process.env.KEYCLOAK_NUXT_CLIENT || "nuxt",
      directusUrl: process.env.DIRECTUS_URL || "http://localhost:8055",

      lotzappShopUrl: process.env.LOTZAPP_SHOP_URL || "",
    },
  },

  vite: {
    optimizeDeps: {
      include: ["yup"],
    },
    server: {
      allowedHosts: ["host.docker.internal"],
    },
  },

  colorMode: {
    preference: "light",
  },

  modules: ["@nuxt/ui", "@nuxtjs/i18n", "@nuxt/eslint"],

  i18n: {
    lazy: true,
    strategy: "no_prefix",
    defaultLocale: "de",
    locales: [
      { code: "en", files: ["shifts/en.json"] }, //
      { code: "de", files: ["shifts/de.json"] }, //
    ],
  },

  css: ["~/assets/css/main.css"],

  ui: {},
});
