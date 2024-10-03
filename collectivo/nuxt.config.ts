// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from "./package.json";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  routeRules: {
    "/mitglied-werden": { redirect: "/register" },
    "/memberships/register": { redirect: "/register" },
    "/shifts/dashboard": { redirect: "/shifts" },
  },
  runtimeConfig: {
    collectivoVersion: pkg.version,
    apiToken: process.env.COLLECTIVO_API_TOKEN || "badToken",
    directusAdminEmail: process.env.DIRECTUS_ADMIN_EMAIL || "api@example.com",
    directusAdminPassword: process.env.DIRECTUS_ADMIN_PASSWORD || "d1r3ctu5",
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
      authService: process.env.COLLECTIVO_AUTH_SERVICE || "keycloak",
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
  },
  colorMode: {
    preference: "light",
  },
  hooks: {},
  modules: ["@nuxt/ui", "@nuxtjs/i18n", "@nuxtjs/google-fonts", "@nuxt/eslint"],
  i18n: {
    lazy: true, // TODO: Lazy loading does not work with current switch
    strategy: "no_prefix",
    defaultLocale: "de",
    langDir: "./lang",
    locales: [
      { code: "en", files: ["de.json", "shifts/en.json"] },
      { code: "de", files: ["de.json", "shifts/de.json"] },
    ],
  },
  css: [join(currentDir, "./assets/css/main.css")],
  ui: {
    global: true,
    icons: ["heroicons"],
    safelistColors: ["primary", "green", "orange", "blue", "pink", "red"],
  },
  googleFonts: {
    download: true,
    families: {
      Urbanist: "100..900",
    },
  },
});
