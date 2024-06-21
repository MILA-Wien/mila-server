// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  extends: ["./base", "./memberships", "./payments", "./shifts"],
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
