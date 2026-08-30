/**
 * Completes the round trip started in middleware/auth.ts: login drops the visitor on the
 * dashboard, so if they were originally heading somewhere else, send them there.
 *
 * This must run on the "app:created" hook, not router.isReady(). Nuxt's own router plugin
 * does an implicit, middleware-less navigation to resolve isReady(), then replays the real
 * (middleware-driven) navigation via a forced router.replace() inside its own "app:created"
 * hook. Restoring on isReady() races that replay and gets overwritten. Registering our own
 * "app:created" hook instead runs after Nuxt's (plugins register in load order, and this is
 * a default-tier plugin loaded after the "pre"-tier router plugin), so the restore survives.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hooks.hookOnce("app:created", () => {
    const router = useRouter();
    const current = router.currentRoute.value;
    // Only the landing spot after login is a redirect; leave normal navigation alone.
    if (current.path !== "/") return;
    const target = takePostLoginRedirect();
    if (!target || target === current.fullPath) return;
    navigateTo(target);
  });
});
