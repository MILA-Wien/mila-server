export default defineEventHandler(async (event) => {
  const user = getUserOrThrowError(event);
  return await dbGetUserProfile(user.user);
});
