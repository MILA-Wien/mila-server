export default defineEventHandler(async (event) => {
  getUserOrThrowError(event);
  return await getSettings();
});
