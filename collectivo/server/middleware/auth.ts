import { createDirectus, readMe, withToken, rest } from "@directus/sdk";

const EXPIRATION_TIME = 3600000; // 1 hour
const CLEANUP_INTERVAL = 3600000; // 1 hour

// Check for directus session token in cookie
// Authenticated user is stored in event.context.auth
// Valid user tokens are cached for one hour
export default defineEventHandler(async (event) => {
  const cookie = getHeader(event, "Cookie");

  if (!(cookie && cookie.includes("directus_session_token="))) return;

  const directusSessionToken = cookie
    .split("directus_session_token=")[1]
    .split(";")[0];

  // Try to use cached user token
  const cachedUser = tokenCache.get(directusSessionToken);
  if (cachedUser && cachedUser.expiresAt > Date.now()) {
    event.context.auth = { user: cachedUser.id, email: cachedUser.email };
    return;
  }

  // Fetch user from directus
  try {
    const config = useRuntimeConfig();
    const directus = createDirectus(config.public.directusUrl).with(rest());
    const user = await directus.request(
      withToken(
        directusSessionToken,
        readMe({
          fields: ["id", "email"],
        }),
      ),
    );

    // Cache user token for one hour
    const expiresAt = Date.now() + EXPIRATION_TIME;
    tokenCache.set(directusSessionToken, {
      id: user.id,
      email: user.email,
      expiresAt,
    });
    event.context.auth = { user: user.id, email: user.email };
    return;
  } catch (e) {
    return;
  }
});

// Token cache to store user tokens
const tokenCache = new Map<
  string,
  { id: string; email: string; expiresAt: number }
>();

// Cleanup function to remove expired tokens
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [token, data] of tokenCache) {
    if (data.expiresAt <= now) {
      tokenCache.delete(token);
    }
  }
};

// Run cleanup function regularly
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);
