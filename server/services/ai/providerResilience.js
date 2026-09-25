import { sleep } from "../../utils/http.js";

export const TRANSIENT_PROVIDER_STATUSES = new Set([
  408,
  429,
  500,
  502,
  503,
  504,
]);

const AUTO_FALLBACK_STATUSES = new Set([
  401,
  403,
  404,
  ...TRANSIENT_PROVIDER_STATUSES,
]);

const circuits = new Map();
const FAILURE_THRESHOLD = 2;
const DEFAULT_OPEN_MS = 20_000;
const RATE_LIMIT_OPEN_MS = 30_000;
const CONFIG_ERROR_OPEN_MS = 5 * 60_000;
const MAX_RETRY_DELAY_MS = 1_500;

function numericStatus(value, fallback = 502) {
  const status = Number(value);
  return Number.isFinite(status) && status >= 100 && status <= 599
    ? status
    : fallback;
}

export function isTransientProviderStatus(status) {
  return TRANSIENT_PROVIDER_STATUSES.has(numericStatus(status, 0));
}

export function shouldAutoFallback(result) {
  if (!result || result.ok) return false;
  if (result.unavailable) return true;
  return AUTO_FALLBACK_STATUSES.has(numericStatus(result.status, 0));
}

export function parseRetryAfterMs(response) {
  const raw = response?.headers?.get?.("retry-after");
  if (!raw) return 0;

  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const date = Date.parse(raw);
  if (!Number.isFinite(date)) return 0;
  return Math.max(0, date - Date.now());
}

function retryDelayMs(attempt, response) {
  const providerDelay = parseRetryAfterMs(response);
  if (providerDelay > 0) return Math.min(providerDelay, MAX_RETRY_DELAY_MS);

  const exponential = 300 * (2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 120);
  return Math.min(MAX_RETRY_DELAY_MS, exponential + jitter);
}

export async function fetchProvider(url, options, { maxAttempts = 2 } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const status = numericStatus(response.status, 502);

      if (response.ok) {
        return { response, attempts: attempt, retryAfterMs: 0 };
      }

      const retryAfterMs = parseRetryAfterMs(response);
      const canRetry =
        attempt < maxAttempts &&
        isTransientProviderStatus(status) &&
        status !== 429;

      if (!canRetry) {
        return { response, attempts: attempt, retryAfterMs };
      }

      await response.arrayBuffer().catch(() => {});
      await sleep(retryDelayMs(attempt, response));
    } catch (error) {
      lastError = error;
      if (error?.name === "AbortError") throw error;
      if (attempt >= maxAttempts) throw error;
      await sleep(retryDelayMs(attempt, null));
    }
  }

  throw lastError || new Error("AI provider request failed.");
}

export function providerCircuitKey(provider, model) {
  return `${String(provider || "unknown").toLowerCase()}:${String(model || "unknown")}`;
}

export function getCircuitState(key) {
  const state = circuits.get(key);
  if (!state) return { open: false, retryAfterMs: 0, failures: 0 };

  const now = Date.now();
  if (state.openUntil && state.openUntil > now) {
    return {
      open: true,
      retryAfterMs: state.openUntil - now,
      failures: state.failures || 0,
    };
  }

  if (state.openUntil) {
    circuits.delete(key);
    return { open: false, retryAfterMs: 0, failures: 0 };
  }

  return { open: false, retryAfterMs: 0, failures: state.failures || 0 };
}

export function recordProviderSuccess(key) {
  circuits.delete(key);
}

export function recordProviderFailure(key, result = {}) {
  const status = numericStatus(result.status, 502);
  const previous = circuits.get(key) || { failures: 0, openUntil: 0 };
  const failures = (previous.failures || 0) + 1;
  let openForMs = 0;

  if (status === 429) {
    openForMs = Math.max(
      RATE_LIMIT_OPEN_MS,
      Math.min(Number(result.retryAfterMs || 0), 2 * 60_000)
    );
  } else if ([401, 403, 404].includes(status)) {
    openForMs = CONFIG_ERROR_OPEN_MS;
  } else if (isTransientProviderStatus(status) && failures >= FAILURE_THRESHOLD) {
    openForMs = DEFAULT_OPEN_MS;
  }

  circuits.set(key, {
    failures,
    openUntil: openForMs > 0 ? Date.now() + openForMs : 0,
    status,
  });

  return getCircuitState(key);
}

export function resetProviderCircuits() {
  circuits.clear();
}
