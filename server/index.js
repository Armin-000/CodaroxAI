import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, "0.0.0.0", () => {
  console.log(`Codarox AI API running on http://localhost:${env.port}`);
  console.log(`Providers: Google=${Boolean(env.geminiApiKey)} OpenRouter=${Boolean(env.openRouterApiKey)}`);
});
