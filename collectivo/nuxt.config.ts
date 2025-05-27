// Main configuration file
// https://nuxt.com/docs/api/configuration/nuxt-config

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

    lotzappMandant: "",
    lotzappSepaId: "",
    lotzappTransferId: "",
    lotzappUser: "",
    lotzappPassword: "",

    public: {
      debug: false,

      collectivoUrl: process.env.COLLECTIVO_URL || "http://localhost:3000",
      contactEmail: process.env.COLLECTIVO_CONTACT_EMAIL || "info@example.com",

      keycloakUrl: process.env.KEYCLOAK_URL || "http://keycloak:8080",
      keycloakRealm: process.env.KEYCLOAK_REALM || "collectivo",
      keycloakClient: process.env.KEYCLOAK_NUXT_CLIENT || "nuxt",
      directusUrl: process.env.DIRECTUS_URL || "http://localhost:8055",
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
      { code: "en", files: ["en.json", "shifts/en.json"] },
      { code: "de", files: ["de.json", "shifts/de.json"] },
    ],
  },

  css: ["~/assets/css/main.css"],

  ui: {
    global: true,
    icons: ["heroicons"],
    safelistColors: ["primary", "green", "orange", "blue", "pink", "red"],
  },
});
