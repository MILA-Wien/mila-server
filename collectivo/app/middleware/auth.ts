// Middleware to protect routes from unauthenticated users
export default defineNuxtRouteMiddleware((to) => {
  const user = useCurrentUser().value;
  if (user.isAuthenticated === true) return;
  // Login always returns to the site root, so remember where the visitor was going.
  stashPostLoginRedirect(to.fullPath);
  return user.login();
});
