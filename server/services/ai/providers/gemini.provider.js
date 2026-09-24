import { buildGeminiPayload } from "../messageAdapter.js";
import { env } from "../../../config/env.js";
import { readProviderError } from "../../../utils/http.js";
import {
  fetchProvider,
  isTransientProviderStatus,
  parseRetryAfterMs,
} from "../providerResilience.js";

function providerErrorFromPayload(parsed) {
  if (!parsed?.error) return null;
  return {
    status: Number(parsed.error.code || parsed.error.status || 502) || 502,
    message: parsed.error.message || "Gemini returned a streaming error.",
  };
}

function ensureReady(state, handlers, modelConfig) {
  if (state.ready) return;
  state.ready = true;
  handlers.onReady({
    provider: "Google",
    model: modelConfig.upstreamModel,
    contextLimit: modelConfig.contextLimit,
  });
}

function parseSseLine(line, state, handlers, modelConfig) {
  const trimmed = String(line || "").replace(/\r$/, "").trim();
  if (!trimmed.startsWith("data:")) return;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return;

  try {
    const parsed = JSON.parse(payload);
    const providerError = providerErrorFromPayload(parsed);
    if (providerError) {
      state.providerError = providerError;
      return;
    }

    const candidate = parsed?.candidates?.[0];
    const text = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
          .map((part) => (typeof part?.text === "string" ? part.text : ""))
          .join("")
      : "";

    if (text) {
      ensureReady(state, handlers, modelConfig);
      state.generatedText += text;
      state.emitted = true;
      handlers.onDelta(text);
    }

    if (candidate?.finishReason) state.finishReason = candidate.finishReason;
    if (parsed?.usageMetadata) state.usage = parsed.usageMetadata;
  } catch (error) {
    console.warn("Gemini SSE parse warning:", error?.message || error);
  }
}

export async function streamGemini({ body, modelConfig, signal, handlers }) {
  if (!env.geminiApiKey) {
    return {
      ok: false,
      status: 503,
      error: "GEMINI_API_KEY is not configured.",
      unavailable: true,
    };
  }

  const payload = buildGeminiPayload(body);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelConfig.upstreamModel)}:streamGenerateContent?alt=sse`;
  let upstream;
  let attempts = 1;

  try {
    const result = await fetchProvider(
      url,
      {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: payload.systemInstruction }] },
          contents: payload.contents,
          generationConfig: {
            temperature: payload.settings.temperature,
            maxOutputTokens: payload.settings.maxTokens,
          },
        }),
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
      error: "Unable to reach the Gemini API.",
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

  const usage = state.usage
    ? {
        promptTokens: Number(state.usage.promptTokenCount || 0),
        completionTokens: Number(state.usage.candidatesTokenCount || 0),
        totalTokens: Number(state.usage.totalTokenCount || 0),
      }
    : null;

  if (!state.ready) ensureReady(state, handlers, modelConfig);

  if (usage) {
    handlers.onUsage({
      usage,
      model: modelConfig.upstreamModel,
      contextLimit: modelConfig.contextLimit,
      provider: "Google",
    });
  }

  if (state.providerError && state.emitted) {
    handlers.onProviderError(state.providerError.message);
  }

  return {
    ok: true,
    provider: "Google",
    model: modelConfig.upstreamModel,
    contextLimit: modelConfig.contextLimit,
    generatedText: state.generatedText,
    finishReason: state.finishReason,
    emitted: state.emitted,
    usage,
    interrupted: Boolean(state.providerError),
    attempts,
  };
}
