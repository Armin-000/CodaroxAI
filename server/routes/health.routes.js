import { Router } from "express";
import { env } from "../config/env.js";

export const healthRouter = Router();
healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    provider: env.geminiApiKey ? "Multi-provider" : "OpenRouter",
    model: env.geminiApiKey ? "auto" : env.openRouterModel,
    contextLimit: env.geminiApiKey ? 1_048_576 : env.defaultContextLimit,
    providers: {
      google: Boolean(env.geminiApiKey),
      openrouter: Boolean(env.openRouterApiKey),
    },
  });
});
