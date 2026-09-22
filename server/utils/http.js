export async function readProviderError(response) {
  const text = await response.text().catch(() => "");
  if (!text) return `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(text);
    return parsed?.error?.message || parsed?.message || text;
  } catch {
    return text;
  }
}

export function errorCodeForStatus(status) {
  if (status === 429) return "rate_limit";
  if (status === 404) return "model_unavailable";
  if (status === 413) return "file_too_large";
  if (status >= 500) return "provider_error";
  return "request_error";
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
