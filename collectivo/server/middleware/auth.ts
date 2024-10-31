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
  const cachedTokenInfo = tokenCache.get(directusSessionToken);
  if (cachedTokenInfo && cachedTokenInfo.expiresAt > Date.now()) {
    event.context.auth = cachedTokenInfo.authContext;
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
          fields: [
            "id",
            "email",
            {
              memberships: ["id"],
            },
          ],
        }),
      ),
    );

    let mship = null;
    if (user.memberships.length > 0) {
      mship = user.memberships[0].id;
    }

    // Cache user token for one hour
    const expiresAt = Date.now() + EXPIRATION_TIME;
    const authContext = { user: user.id, email: user.email, mship: mship };
    tokenCache.set(directusSessionToken, { expiresAt, authContext });
    event.context.auth = authContext;
    return;
  } catch (e) {
    return;
  }
});

interface TokenCacheEntry {
  authContext: ServerUserInfo;
  expiresAt: number;
}

// Token cache to store user tokens
const tokenCache = new Map<string, TokenCacheEntry>();

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
