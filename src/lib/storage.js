import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../config/constants.js";

export function localDayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function loadHistory() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "null");
    if (Array.isArray(current)) return current;
    const legacy = JSON.parse(localStorage.getItem("codarox-ai-history-v1") || "[]");
    return Array.isArray(legacy) ? legacy : [];
  } catch {
    return [];
  }
}

export function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
    const stored = parsed && typeof parsed === "object" ? parsed : {};
    const merged = { ...DEFAULT_SETTINGS, ...stored };
    if (Number(stored.settingsVersion || 0) < 2 && Number(merged.temperature) === 0.7) {
      merged.temperature = 0.35;
    }
    merged.settingsVersion = 2;
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function loadRequestUsage() {
  const today = localDayKey();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.requests) || "{}");
    return parsed?.date === today ? { date: today, count: Number(parsed.count || 0) } : { date: today, count: 0 };
  } catch {
    return { date: today, count: 0 };
  }
}

export function sanitizeMessageForStorage(message) {
  const attachments = Array.isArray(message.attachments)
    ? message.attachments.map(({ data, text, ...attachment }) => attachment)
    : undefined;

  const generatedImage = message?.generatedImage
    ? {
        ...message.generatedImage,
        dataUrl: undefined,
        storageKey:
          message.generatedImage.storageKey ||
          message.id,
      }
    : undefined;

  return {
    ...message,
    ...(attachments ? { attachments } : {}),
    ...(generatedImage ? { generatedImage } : {}),
  };
}
