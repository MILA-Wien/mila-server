export default defineEventHandler(async (event) => {
  getMemberOrThrowError(event);
  return await dbGetSolitopfStats();
});
