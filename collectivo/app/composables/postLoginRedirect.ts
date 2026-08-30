/**
 * Remembers where a logged-out visitor was heading, across the login round trip.
 *
 * The Keycloak flow always returns to the site root: middleware/auth.ts sends the visitor
 * to /login, and login.vue hands Directus a fixed `redirect=${collectivoUrl}`. Directus
 * only accepts URLs on its AUTH_KEYCLOAK_REDIRECT_ALLOW_LIST (the bare root in
 * production), so the intended path cannot be passed through the provider without an
 * infrastructure change.
 *
 * Stashing it in localStorage instead keeps everything on one origin, needs no env
 * change, and behaves the same in dev - where Keycloak is bypassed entirely and
 * loginDevMode also hardcodes the root. If anything goes wrong the visitor simply lands
 * on the dashboard, which is exactly what happens today.
 */

const KEY = "collectivo:post-login-redirect";
const TTL_MS = 10 * 60 * 1000;

export function stashPostLoginRedirect(fullPath: string) {
  if (!fullPath || fullPath === "/") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ path: fullPath, at: Date.now() }),
    );
  } catch {
    // Private mode or blocked site data: fall back to landing on the dashboard.
  }
}

/** Reads and clears the stashed path. Returns null if absent, stale or unsafe. */
export function takePostLoginRedirect(): string | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw) localStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const { path, at } = JSON.parse(raw);
    if (typeof path !== "string" || typeof at !== "number") return null;
    if (Date.now() - at > TTL_MS) return null;
    // Same-origin paths only - never turn the stash into an open redirect.
    if (!path.startsWith("/") || path.startsWith("//")) return null;
    return path;
  } catch {
    return null;
  }
}
