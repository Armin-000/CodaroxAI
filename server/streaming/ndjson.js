export function beginNdjson(res) {
  if (res.headersSent) return;
  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
}

export function writeEvent(res, event) {
  if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
}
