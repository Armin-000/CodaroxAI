import express from "express";
import fs from "node:fs";
import path from "node:path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { chatRouter } from "./routes/chat.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { imageRouter } from "./routes/image.routes.js";
import { providerRouter } from "./routes/provider.routes.js";
import { titleRouter } from "./routes/title.routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "24mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/images", imageRouter);
  app.use("/api/title", titleRouter);
  app.use("/api", providerRouter);

  const distPath = path.join(env.projectRoot, "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
      return res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
