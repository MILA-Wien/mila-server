// Middleware to protect routes from unauthenticated users
export default defineNuxtRouteMiddleware(() => {
  if (!useCurrentUser().value.isStudioAdmin) {
    return abortNavigation("admin only");
  }
});
