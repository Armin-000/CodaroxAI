import { randomUUID } from "node:crypto";
import { routeChat } from "../services/ai/modelRouter.js";
import { beginNdjson, writeEvent } from "../streaming/ndjson.js";
import { errorCodeForStatus } from "../utils/http.js";

export async function chatController(req, res) {
  const controller = new AbortController();
  const requestId = randomUUID().slice(0, 8);
  let started = false;

  res.setHeader("X-Codarox-Request-Id", requestId);

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
      if (!started) {
        beginNdjson(res);
        started = true;
      }
      writeEvent(res, { type: "delta", text });
    },
    onReplace(text) {
      if (!started) {
        beginNdjson(res);
        started = true;
      }
      writeEvent(res, { type: "replace", text });
    },
    onUsage({ usage, model, contextLimit, provider }) {
      if (!started) {
        beginNdjson(res);
        started = true;
      }
      writeEvent(res, { type: "usage", usage, model, contextLimit, provider });
    },
    onProviderError(message) {
      if (!started) {
        beginNdjson(res);
        started = true;
      }
      writeEvent(res, { type: "error", message });
    },
  };

  try {
    const result = await routeChat({
      body: req.body || {},
      signal: controller.signal,
      origin: req.headers.origin,
      handlers,
      requestId,
    });

    if (!result.ok) {
      if (res.headersSent) {
        writeEvent(res, {
          type: "error",
          message: result.error || "AI provider unavailable.",
          requestId,
        });
        return res.end();
      }

      const status = result.status || 502;
      if (result.retryAfterMs > 0) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))));
      }

      return res.status(status).json({
        code: errorCodeForStatus(status),
        error: result.error || "AI provider unavailable.",
        retryAfterMs: Number(result.retryAfterMs || 0),
        requestId,
      });
    }

    if (!started) {
      beginNdjson(res);
      started = true;
    }

    writeEvent(res, {
      type: "done",
      provider: result.provider,
      model: result.model,
      contextLimit: result.contextLimit,
      hasUsage: Boolean(result.usage),
      emitted: Boolean(result.emitted),
      finishReason: result.finishReason || null,
      interrupted: Boolean(result.interrupted),
      requestId,
    });
    return res.end();
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error(`[Codarox AI][${requestId}] chat controller error:`, error);

    if (!res.headersSent) {
      return res.status(502).json({
        code: "provider_error",
        error: "Unable to reach the AI provider.",
        requestId,
      });
    }

    writeEvent(res, {
      type: "error",
      message: "The AI stream was interrupted.",
      requestId,
    });
    res.end();
  }
}
