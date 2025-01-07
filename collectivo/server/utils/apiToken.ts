import type { H3Event } from "h3";

// Check if there is a valid API token in the request or throw an error
export function verifyCollectivoApiToken(
  event: H3Event,
  tokenName: string = "apiToken",
) {
  const headers = getHeaders(event);

  if (!Object.hasOwn(headers, "authorization")) {
    throw createError({
      statusCode: 401,
      statusMessage: "No token provided",
    });
  }

  const token = headers["authorization"]?.replace("Bearer ", "");

  if (token !== useRuntimeConfig()[tokenName]) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid token",
    });
  }
}
