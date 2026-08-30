/**
 * Completes the round trip started in middleware/auth.ts: login drops the visitor on the
 * dashboard, so if they were originally heading somewhere else, send them there.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter();
  router.isReady().then(() => {
    const current = router.currentRoute.value;
    // Only the landing spot after login is a redirect; leave normal navigation alone.
    if (current.path !== "/") return;
    const target = takePostLoginRedirect();
    if (!target || target === current.fullPath) return;
    navigateTo(target);
  });
});
