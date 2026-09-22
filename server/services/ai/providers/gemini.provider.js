import { buildGeminiPayload } from "../messageAdapter.js";
import { env } from "../../../config/env.js";
import { readProviderError, sleep } from "../../../utils/http.js";

const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

async function fetchWithRetry(url, options, attempts = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok || !TRANSIENT_STATUSES.has(response.status) || attempt === attempts - 1) return response;
      await response.arrayBuffer().catch(() => {});
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw error;
    }
    await sleep(750 * (2 ** attempt));
  }
  throw lastError || new Error("Gemini request failed.");
}

function parseSseLine(line, state, handlers) {
  const trimmed = String(line || "").replace(/\r$/, "").trim();
  if (!trimmed.startsWith("data:")) return;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return;
  try {
    const parsed = JSON.parse(payload);
    const candidate = parsed?.candidates?.[0];
    const text = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts.map((part) => typeof part?.text === "string" ? part.text : "").join("")
      : "";
    if (text) {
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
    return { ok: false, status: 503, error: "GEMINI_API_KEY is not configured.", unavailable: true };
  }

  const payload = buildGeminiPayload(body);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelConfig.upstreamModel)}:streamGenerateContent?alt=sse`;
  let upstream;
  try {
    upstream = await fetchWithRetry(url, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiApiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: payload.systemInstruction }] },
        contents: payload.contents,
        generationConfig: {
          temperature: payload.settings.temperature,
          maxOutputTokens: payload.settings.maxTokens,
        },
      }),
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return { ok: false, status: 502, error: "Unable to reach the Gemini API.", unavailable: true };
  }

  if (!upstream.ok || !upstream.body) {
    return {
      ok: false,
      status: upstream.status || 502,
      error: await readProviderError(upstream),
      unavailable: TRANSIENT_STATUSES.has(upstream.status),
    };
  }

  handlers.onReady({ provider: "Google", model: modelConfig.upstreamModel, contextLimit: modelConfig.contextLimit });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const state = { generatedText: "", emitted: false, finishReason: null, usage: null };
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) parseSseLine(line, state, handlers);
  }
  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split(/\r?\n/)) parseSseLine(line, state, handlers);
  }

  const usage = state.usage ? {
    promptTokens: Number(state.usage.promptTokenCount || 0),
    completionTokens: Number(state.usage.candidatesTokenCount || 0),
    totalTokens: Number(state.usage.totalTokenCount || 0),
  } : null;

  if (usage) handlers.onUsage({ usage, model: modelConfig.upstreamModel, contextLimit: modelConfig.contextLimit, provider: "Google" });

  return {
    ok: true,
    provider: "Google",
    model: modelConfig.upstreamModel,
    contextLimit: modelConfig.contextLimit,
    generatedText: state.generatedText,
    finishReason: state.finishReason,
    emitted: state.emitted,
    usage,
  };
}
