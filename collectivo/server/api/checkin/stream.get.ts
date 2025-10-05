import {
  addCheckinSubscriber,
  removeCheckinSubscriber,
} from "~~/server/utils/checkin";

export default defineEventHandler((event) => {
  const res = event.node.res;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  addCheckinSubscriber(res);

  event.node.req.on("close", () => {
    removeCheckinSubscriber(res);
  });

  return res;
});
