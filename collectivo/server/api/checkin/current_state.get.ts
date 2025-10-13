export default defineEventHandler(async (event) => {
  confirmCheckinUser(event);
  return getCheckinState();
});
