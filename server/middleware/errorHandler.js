export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (res.headersSent) return res.end();
  return res.status(500).json({ error: "Internal server error." });
}
