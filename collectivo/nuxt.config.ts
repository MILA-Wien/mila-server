// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  extends: [
    "@collectivo/collectivo",
    "@collectivo/payments",
    "@collectivo/memberships",
  ],
  runtimeConfig: {
    lotzappMandant: "",
    lotzappSepaId: "",
    lotzappTransferId: "",
    lotzappUser: "",
    lotzappPassword: "",
  },
  vite: {
    optimizeDeps: {
      include: ["yup"],
    },
  },
  i18n: {
    langDir: "./lang",
    defaultLocale: "de",
    locales: [
      { code: "en", file: "en.json" },
      { code: "de", file: "de.json" },
    ],
  },
});
