import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const env = Object.freeze({
  port: Number(process.env.PORT || 8787),
  appName: process.env.APP_NAME || "Codarox AI",
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: (process.env.OPENROUTER_MODEL || "inclusionai/ling-3.0-flash-vl:free").trim(),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  defaultContextLimit: Number(process.env.CONTEXT_LIMIT || 262144),
  projectRoot: path.resolve(__dirname, "../.."),
});
