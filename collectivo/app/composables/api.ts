export async function getApiHeaders() {
  const directus = useDirectus();
  const headers: { [key: string]: string } = {
    Accept: "application/json",
  };
  try {
    const token = await directus.refresh();
    headers["Authorization"] = `${token.access_token}`;
  } catch {}
  return headers;
}
