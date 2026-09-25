export const MODEL_OPTIONS = [
  {
    value: "auto",
    shortLabel: "Auto",
    label: "Auto — Recommended",
    provider: "Multi-provider",
    contextTokens: 1_048_576,
    contextLabel: "Up to 1M",
    inputs: "Text, images, PDF",
    supportsVision: true,
    bestFor: "Everyday use",
    description:
      "Routes across Gemini and OpenRouter automatically, with resilient fallback when a provider is busy or unavailable.",
    badge: "Recommended",
  },
  {
    value: "gemini-3.8-flash",
    shortLabel: "Gemini 3.8",
    label: "Gemini 3.8 Flash",
    provider: "Google",
    contextTokens: 1_048_576,
    contextLabel: "1M",
    inputs: "Text, images, PDF, audio, video",
    supportsVision: true,
    bestFor: "Quality, coding, reasoning",
    description:
      "Google's most capable Flash model for complex work, coding and large multimodal documents.",
    badge: "Best quality",
  },
  {
    value: "gemini-3.5-flash-lite",
    shortLabel: "Gemini Lite",
    label: "Gemini 3.5 Flash-Lite",
    provider: "Google",
    contextTokens: 1_048_576,
    contextLabel: "1M",
    inputs: "Text, images, PDF, audio, video",
    supportsVision: true,
    bestFor: "Speed, high-volume chat",
    description:
      "Fast, efficient Gemini model suited to routine tasks and higher-volume usage.",
    badge: "Fast",
  },
  {
    value: "ling-3.0-flash-vl",
    shortLabel: "Ling 3.0",
    label: "Ling 3.0 Flash VL",
    provider: "OpenRouter",
    contextTokens: 262_144,
    contextLabel: "262K",
    inputs: "Text, images, video",
    supportsVision: true,
    bestFor: "Fast multimodal chat",
    description:
      "Free multimodal OpenRouter model with native visual understanding.",
    badge: "Free",
  },
  {
    value: "nemotron-3-ultra",
    shortLabel: "Nemotron",
    label: "Nemotron 3 Ultra",
    provider: "OpenRouter",
    contextTokens: 1_000_000,
    contextLabel: "1M",
    inputs: "Text",
    supportsVision: false,
    bestFor: "Coding, research, reasoning",
    description:
      "Large reasoning model for coding, planning, deep research and long text workflows.",
    badge: "Reasoning",
  },
];

export function getModelOption(value) {
  return (
    MODEL_OPTIONS.find(
      (model) => model.value === value
    ) || MODEL_OPTIONS[0]
  );
}


const RUNTIME_MODEL_ALIASES = new Map([
  ["gemini-3.8-flash", "gemini-3.8-flash"],
  ["gemini-3.5-flash-lite", "gemini-3.5-flash-lite"],
  ["inclusionai/ling-3.0-flash-vl:free", "ling-3.0-flash-vl"],
  ["ling-3.0-flash-vl", "ling-3.0-flash-vl"],
  ["nvidia/nemotron-3-ultra-550b-a55b:free", "nemotron-3-ultra"],
  ["nemotron-3-ultra", "nemotron-3-ultra"],
]);

export function resolveRuntimeModelChoice(runtimeModel) {
  const value = String(runtimeModel || "").trim().toLowerCase();
  if (!value) return null;

  if (RUNTIME_MODEL_ALIASES.has(value)) {
    return RUNTIME_MODEL_ALIASES.get(value);
  }

  const direct = MODEL_OPTIONS.find((model) => model.value.toLowerCase() === value);
  return direct?.value || null;
}

export function modelSupportsVision(value) {
  return getModelOption(value).supportsVision !== false;
}
