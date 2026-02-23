export default defineEventHandler(async (event) => {
  const user = getMemberOrThrowError(event);
  return await dbGetSolitopfRequests(user.mship);
});
