import { getModelConfig, MODEL_CONFIG } from "../../config/models.js";
import { env } from "../../config/env.js";
import {
  extractLastUserText,
  normalizeCroatianResponse,
  shouldNormalizeCroatian,
} from "../language/croatianNormalizer.js";
import { streamGemini } from "./providers/gemini.provider.js";
import { streamOpenRouter } from "./providers/openrouter.provider.js";
import {
  getCircuitState,
  providerCircuitKey,
  recordProviderFailure,
  recordProviderSuccess,
  shouldAutoFallback,
} from "./providerResilience.js";

const AUTO_ROUTE = Object.freeze([
  { provider: "google", modelId: "gemini-3.8-flash" },
  { provider: "google", modelId: "gemini-3.5-flash-lite" },
  { provider: "openrouter", modelId: "ling-3.0-flash-vl" },
  { provider: "openrouter", modelId: "openrouter-free" },
]);

function selectedChoice(body) {
  const requested = String(body?.model || body?.settings?.model || "auto").trim();
  return Object.hasOwn(MODEL_CONFIG, requested) ? requested : "auto";
}

function croatianPolicy(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const normalize = shouldNormalizeCroatian(body, extractLastUserText(messages));
  const stripGreeting = messages.filter((message) => message?.role === "user").length > 1;
  return { normalize, stripGreeting };
}

function providerConfigured(provider) {
  if (provider === "google") return Boolean(env.geminiApiKey);
  if (provider === "openrouter") return Boolean(env.openRouterApiKey);
  return false;
}

function providerLabel(provider) {
  return provider === "google" ? "Google" : "OpenRouter";
}

function shortError(value) {
  return String(value || "Unknown provider error")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

async function runProvider({ provider, body, modelConfig, signal, origin, handlers }) {
  if (provider === "google") {
    return streamGemini({ body, modelConfig, signal, handlers });
  }
  return streamOpenRouter({ body, modelConfig, signal, origin, handlers });
}

function retryAfterFromFailures(failures) {
  const values = failures
    .map((failure) => Number(failure.retryAfterMs || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : 0;
}

function aggregateAutoFailure(failures) {
  const attempted = failures.filter((failure) => !failure.skipped);
  const allRateLimited = attempted.length > 0 && attempted.every((failure) => failure.status === 429);
  const retryAfterMs = retryAfterFromFailures(failures);

  return {
    ok: false,
    status: allRateLimited ? 429 : 503,
    error: allRateLimited
      ? "All available AI routes are temporarily rate-limited. Please try again shortly."
      : "All available AI routes are temporarily unavailable. Please try again shortly.",
    unavailable: true,
    retryAfterMs,
    routeFailures: failures.map(({ provider, model, status, skipped }) => ({
      provider,
      model,
      status,
      skipped: Boolean(skipped),
    })),
  };
}

async function routeAuto({ body, signal, origin, handlers, requestId }) {
  const candidates = AUTO_ROUTE.filter((candidate) => providerConfigured(candidate.provider));

  if (!candidates.length) {
    return {
      ok: false,
      status: 503,
      error: "No AI provider is configured. Add GEMINI_API_KEY or OPENROUTER_API_KEY.",
      unavailable: true,
    };
  }

  const failures = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const modelConfig = MODEL_CONFIG[candidate.modelId];
    const key = providerCircuitKey(candidate.provider, modelConfig.upstreamModel);
    const circuit = getCircuitState(key);

    if (circuit.open) {
      failures.push({
        provider: providerLabel(candidate.provider),
        model: modelConfig.upstreamModel,
        status: 503,
        retryAfterMs: circuit.retryAfterMs,
        skipped: true,
      });
      console.warn(
        `[Codarox AI][${requestId}] skip ${providerLabel(candidate.provider)}/${modelConfig.upstreamModel} ` +
        `(circuit open ${Math.ceil(circuit.retryAfterMs / 1000)}s)`
      );
      continue;
    }

    console.info(
      `[Codarox AI][${requestId}] route ${index + 1}/${candidates.length} -> ` +
      `${providerLabel(candidate.provider)}/${modelConfig.upstreamModel}`
    );

    const result = await runProvider({
      provider: candidate.provider,
      body,
      modelConfig,
      signal,
      origin,
      handlers,
    });

    if (result.ok) {
      recordProviderSuccess(key);
      console.info(
        `[Codarox AI][${requestId}] selected ${result.provider}/${result.model} ` +
        `(provider attempts: ${result.attempts || 1})`
      );
      return result;
    }

    const circuitAfterFailure = recordProviderFailure(key, result);
    failures.push({
      provider: providerLabel(candidate.provider),
      model: modelConfig.upstreamModel,
      status: Number(result.status || 502),
      retryAfterMs: Math.max(Number(result.retryAfterMs || 0), Number(circuitAfterFailure.retryAfterMs || 0)),
      skipped: false,
    });

    console.warn(
      `[Codarox AI][${requestId}] ${providerLabel(candidate.provider)}/${modelConfig.upstreamModel} ` +
      `failed HTTP ${result.status || 502}: ${shortError(result.error)}`
    );

    if (!shouldAutoFallback(result)) {
      return result;
    }
  }

  return aggregateAutoFailure(failures);
}

export async function routeChat({ body, signal, origin, handlers, requestId = "no-request-id" }) {
  const choice = selectedChoice(body);
  const requested = getModelConfig(choice);
  const language = croatianPolicy(body);

  let result;

  if (choice === "auto") {
    result = await routeAuto({ body, signal, origin, handlers, requestId });
    return result.ok ? finalize(result, language, handlers) : result;
  }

  result = await runProvider({
    provider: requested.provider,
    body,
    modelConfig: requested,
    signal,
    origin,
    handlers,
  });

  return result.ok ? finalize(result, language, handlers) : result;
}

function finalize(result, language, handlers) {
  if (language.normalize && result.generatedText?.trim()) {
    const normalized = normalizeCroatianResponse(result.generatedText, {
      stripGreeting: language.stripGreeting,
      stripGenericEnding: true,
    });
    if (normalized && normalized !== result.generatedText) {
      handlers.onReplace(normalized);
      result.generatedText = normalized;
    }
  }
  return result;
}
