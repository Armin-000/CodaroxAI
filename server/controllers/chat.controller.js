import { routeChat } from "../services/ai/modelRouter.js";
import { beginNdjson, writeEvent } from "../streaming/ndjson.js";
import { errorCodeForStatus } from "../utils/http.js";

export async function chatController(req, res) {
  const controller = new AbortController();
  let started = false;

  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  const handlers = {
    onReady() {
      if (!started) {
        beginNdjson(res);
        started = true;
      }
    },
    onDelta(text) {
      if (!started) { beginNdjson(res); started = true; }
      writeEvent(res, { type: "delta", text });
    },
    onReplace(text) {
      if (!started) { beginNdjson(res); started = true; }
      writeEvent(res, { type: "replace", text });
    },
    onUsage({ usage, model, contextLimit, provider }) {
      if (!started) { beginNdjson(res); started = true; }
      writeEvent(res, { type: "usage", usage, model, contextLimit, provider });
    },
    onProviderError(message) {
      if (!started) { beginNdjson(res); started = true; }
      writeEvent(res, { type: "error", message });
    },
  };

  try {
    const result = await routeChat({
      body: req.body || {},
      signal: controller.signal,
      origin: req.headers.origin,
      handlers,
    });

    if (!result.ok) {
      if (res.headersSent) {
        writeEvent(res, { type: "error", message: result.error || "AI provider unavailable." });
        return res.end();
      }
      const status = result.status || 502;
      return res.status(status).json({ code: errorCodeForStatus(status), error: result.error || "AI provider unavailable." });
    }

    if (!started) { beginNdjson(res); started = true; }
    writeEvent(res, {
      type: "done",
      provider: result.provider,
      model: result.model,
      contextLimit: result.contextLimit,
      hasUsage: Boolean(result.usage),
      emitted: Boolean(result.emitted),
      finishReason: result.finishReason || null,
    });
    return res.end();
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("Chat controller error:", error);
    if (!res.headersSent) {
      return res.status(502).json({ code: "provider_error", error: "Unable to reach the AI provider." });
    }
    writeEvent(res, { type: "error", message: "The AI stream was interrupted." });
    res.end();
  }
}
