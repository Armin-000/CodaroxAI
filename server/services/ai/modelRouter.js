import { getModelConfig, MODEL_CONFIG } from "../../config/models.js";
import { env } from "../../config/env.js";
import { extractLastUserText, normalizeCroatianResponse, shouldNormalizeCroatian } from "../language/croatianNormalizer.js";
import { streamGemini } from "./providers/gemini.provider.js";
import { streamOpenRouter } from "./providers/openrouter.provider.js";

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

async function runProvider({ provider, body, modelConfig, signal, origin, handlers }) {
  if (provider === "google") return streamGemini({ body, modelConfig, signal, handlers });
  return streamOpenRouter({ body, modelConfig, signal, origin, handlers });
}

export async function routeChat({ body, signal, origin, handlers }) {
  const choice = selectedChoice(body);
  const requested = getModelConfig(choice);
  const language = croatianPolicy(body);

  let result;

  if (choice === "auto") {
    if (env.geminiApiKey) {
      result = await runProvider({
        provider: "google",
        body,
        modelConfig: MODEL_CONFIG["gemini-3.8-flash"],
        signal,
        origin,
        handlers,
      });
      if (result.ok) return finalize(result, language, handlers);
      if (!result.unavailable) return result;
    }

    result = await runProvider({
      provider: "openrouter",
      body,
      modelConfig: MODEL_CONFIG["ling-3.0-flash-vl"],
      signal,
      origin,
      handlers,
    });
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
