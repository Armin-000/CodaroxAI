import { DEFAULT_CONTEXT_LIMIT } from "../config/constants.js";

export function emptyContextUsage() {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    contextLimit: DEFAULT_CONTEXT_LIMIT,
    model: null,
  };
}
