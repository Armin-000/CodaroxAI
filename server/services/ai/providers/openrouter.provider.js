import { env } from "../../../config/env.js";
import { buildOpenRouterPayload } from "../messageAdapter.js";
import { readProviderError } from "../../../utils/http.js";
import {
  fetchProvider,
  isTransientProviderStatus,
  parseRetryAfterMs,
} from "../providerResilience.js";

function extractDeltaContent(parsed) {
  const value = parsed?.choices?.[0]?.delta?.content;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        return part?.type === "text" ? part?.text || "" : "";
      })
      .join("");
  }
  return "";
}

function normalizeStreamError(error) {
  const rawStatus = error?.code || error?.status || error?.metadata?.status || 502;
  const status = Number(rawStatus);
  return {
    status: Number.isFinite(status) ? status : 502,
    message: error?.message || "OpenRouter returned a streaming error.",
  };
}

function ensureReady(state, handlers, modelConfig) {
  if (state.ready) return;
  state.ready = true;
  handlers.onReady({
    provider: "OpenRouter",
    model: state.actualModel || modelConfig.upstreamModel,
    contextLimit: modelConfig.contextLimit,
  });
}

function parseSseLine(line, state, handlers, modelConfig) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("data:")) return;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return;

  try {
    const parsed = JSON.parse(payload);
    if (parsed?.model) state.actualModel = parsed.model;

    if (parsed?.error) {
      state.providerError = normalizeStreamError(parsed.error);
      return;
    }

    const choice = parsed?.choices?.[0];
    if (choice?.finish_reason) state.finishReason = choice.finish_reason;

    const delta = extractDeltaContent(parsed);
    if (delta) {
      ensureReady(state, handlers, modelConfig);
      state.generatedText += delta;
      state.emitted = true;
      handlers.onDelta(delta);
    }

    if (parsed?.usage) {
      state.usage = {
        promptTokens: Number(parsed.usage.prompt_tokens || 0),
        completionTokens: Number(parsed.usage.completion_tokens || 0),
        totalTokens: Number(parsed.usage.total_tokens || 0),
      };
    }
  } catch {
    // Ignore non-JSON provider metadata.
  }
}

export async function streamOpenRouter({ body, modelConfig, signal, origin, handlers }) {
  if (!env.openRouterApiKey) {
    return {
      ok: false,
      status: 503,
      error: "OPENROUTER_API_KEY is not configured.",
      unavailable: true,
    };
  }

  const payload = await buildOpenRouterPayload(body, modelConfig);
  const requestBody = {
    model: modelConfig.upstreamModel,
    stream: true,
    usage: { include: true },
    temperature: payload.settings.temperature,
    max_tokens: payload.settings.maxTokens,
    provider: { sort: "latency", allow_fallbacks: true },
    messages: payload.messages,
  };

  if (payload.needsPdfParser) {
    requestBody.plugins = [{ id: "file-parser", pdf: { engine: "pdf-text" } }];
  }

  let upstream;
  let attempts = 1;

  try {
    const result = await fetchProvider(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        signal,
        headers: {
          Authorization: `Bearer ${env.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": origin || "http://localhost:5173",
          "X-Title": env.appName,
        },
        body: JSON.stringify(requestBody),
      },
      { maxAttempts: 2 }
    );
    upstream = result.response;
    attempts = result.attempts;
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return {
      ok: false,
      status: 502,
      error: "Unable to reach OpenRouter.",
      unavailable: true,
      attempts,
    };
  }

  if (!upstream.ok || !upstream.body) {
    const retryAfterMs = parseRetryAfterMs(upstream);
    return {
      ok: false,
      status: upstream.status || 502,
      error: await readProviderError(upstream),
      unavailable: isTransientProviderStatus(upstream.status),
      retryAfterMs,
      attempts,
    };
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const state = {
    generatedText: "",
    emitted: false,
    ready: false,
    finishReason: null,
    usage: null,
    actualModel: modelConfig.upstreamModel,
    providerError: null,
  };
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) parseSseLine(line, state, handlers, modelConfig);
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split(/\r?\n/)) {
      parseSseLine(line, state, handlers, modelConfig);
    }
  }

  if (state.providerError && !state.emitted) {
    return {
      ok: false,
      status: state.providerError.status || 502,
      error: state.providerError.message,
      unavailable: true,
      attempts,
    };
  }

  if (!state.ready) ensureReady(state, handlers, modelConfig);

  if (state.usage) {
    handlers.onUsage({
      usage: state.usage,
      model: state.actualModel || modelConfig.upstreamModel,
      contextLimit: modelConfig.contextLimit,
      provider: "OpenRouter",
    });
  }

  if (state.providerError && state.emitted) {
    handlers.onProviderError(state.providerError.message);
  }

  return {
    ok: true,
    provider: "OpenRouter",
    model: state.actualModel,
    contextLimit: modelConfig.contextLimit,
    generatedText: state.generatedText,
    finishReason: state.finishReason,
    emitted: state.emitted,
    usage: state.usage,
    interrupted: Boolean(state.providerError),
    attempts,
  };
}
