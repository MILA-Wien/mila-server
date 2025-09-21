export async function getApiHeaders() {
  const directus = useDirectus();
  const headers: { [key: string]: string } = {
    Accept: "application/json",
  };
  try {
    // Add token to header if exists
    const token = await directus.refresh();
    headers["Authorization"] = `${token.access_token}`;
  } catch {
    // do nothing
  }
  return headers;
}
