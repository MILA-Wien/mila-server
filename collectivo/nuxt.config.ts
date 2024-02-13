// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  extends: [
    "@collectivo/collectivo",
    "@collectivo/payments",
    "@collectivo/memberships",
    ["github:MILA-Wien/collectivo-mila2", { install: true }],
  ],
  vite: {
    optimizeDeps: {
      include: ["yup"],
    },
  },
});
