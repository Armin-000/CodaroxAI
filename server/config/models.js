export const MODEL_CONFIG = Object.freeze({
  auto: {
    id: "auto",
    provider: "auto",
    contextLimit: 1_048_576,
  },
  "gemini-3.8-flash": {
    id: "gemini-3.8-flash",
    provider: "google",
    upstreamModel: "gemini-3.8-flash",
    contextLimit: 1_048_576,
    multimodal: true,
  },
  "gemini-3.5-flash-lite": {
    id: "gemini-3.5-flash-lite",
    provider: "google",
    upstreamModel: "gemini-3.5-flash-lite",
    contextLimit: 1_048_576,
    multimodal: true,
  },
  "ling-3.0-flash-vl": {
    id: "ling-3.0-flash-vl",
    provider: "openrouter",
    upstreamModel: "inclusionai/ling-3.0-flash-vl:free",
    contextLimit: 262_144,
    multimodal: true,
  },
  "nemotron-3-ultra": {
    id: "nemotron-3-ultra",
    provider: "openrouter",
    upstreamModel: "nvidia/nemotron-3-ultra-550b-a55b:free",
    contextLimit: 1_000_000,
    textOnly: true,
  },
});

export function getModelConfig(choice = "auto") {
  return MODEL_CONFIG[choice] || MODEL_CONFIG.auto;
}
