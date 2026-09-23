import { env } from "../../../config/env.js";
import { buildOpenRouterPayload } from "../messageAdapter.js";
import { readProviderError, sleep } from "../../../utils/http.js";

/* CODAROX_PROVIDER_RETRY_V1 */

const TRANSIENT_STATUSES = new Set([
  408,
  500,
  502,
  503,
  504,
]);

async function fetchWithRetry(url, options, attempts = 2) {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);

      if (
        response.ok ||
        !TRANSIENT_STATUSES.has(response.status) ||
        attempt === attempts - 1
      ) {
        return response;
      }

      /*
       * Consume failed body before retrying.
       */
      await response.arrayBuffer().catch(() => {});
    } catch (error) {
      lastError = error;

      if (
        error?.name === "AbortError" ||
        attempt === attempts - 1
      ) {
        throw error;
      }
    }

    /*
     * Short exponential delay:
     * first retry after ~650 ms.
     */
    await sleep(650 * (2 ** attempt));
  }

  throw lastError || new Error("OpenRouter request failed.");
}

function extractDeltaContent(parsed) {
  const value = parsed?.choices?.[0]?.delta?.content;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((part) => {
      if (typeof part === "string") return part;
      return part?.type === "text" ? part?.text || "" : "";
    }).join("");
  }
  return "";
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
      handlers.onProviderError(parsed.error.message || "Provider returned an error.");
      return;
    }
    const choice = parsed?.choices?.[0];
    if (choice?.finish_reason) state.finishReason = choice.finish_reason;
    const delta = extractDeltaContent(parsed);
    if (delta) {
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
      handlers.onUsage({
        usage: state.usage,
        model: state.actualModel || modelConfig.upstreamModel,
        contextLimit: modelConfig.contextLimit,
        provider: "OpenRouter",
      });
    }
  } catch {
    // Ignore non-JSON provider metadata.
  }
}

export async function streamOpenRouter({ body, modelConfig, signal, origin, handlers }) {
  if (!env.openRouterApiKey) {
    return { ok: false, status: 503, error: "OPENROUTER_API_KEY is not configured.", unavailable: true };
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
  if (payload.needsPdfParser) requestBody.plugins = [{ id: "file-parser", pdf: { engine: "pdf-text" } }];

  let upstream;
  try {
    upstream = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": origin || "http://localhost:5173",
        "X-Title": env.appName,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return { ok: false, status: 502, error: "Unable to reach OpenRouter.", unavailable: true };
  }

  if (!upstream.ok || !upstream.body) {
    return {
      ok: false,
      status: upstream.status || 502,
      error: await readProviderError(upstream),
      unavailable: TRANSIENT_STATUSES.has(upstream.status) || upstream.status === 429,
    };
  }

  handlers.onReady({ provider: "OpenRouter", model: modelConfig.upstreamModel, contextLimit: modelConfig.contextLimit });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const state = { generatedText: "", emitted: false, finishReason: null, usage: null, actualModel: modelConfig.upstreamModel };
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
    for (const line of buffer.split(/\r?\n/)) parseSseLine(line, state, handlers, modelConfig);
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
  };
}
