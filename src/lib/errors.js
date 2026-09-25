export function friendlyError(status, message = "") {
  const lowered = String(message || "").toLowerCase();
  if (status === 402) {
    return {
      code: "payment_required",
      title: "OpenRouter credits required",
      message:
        message ||
        "Image generation requires available OpenRouter credits.",
      retryable: false,
    };
  }

  if (status === 429) {
    const dailyLimit =
      lowered.includes("free allocation") ||
      lowered.includes("10,000") ||
      lowered.includes("account limited");

    return {
      code: "rate_limit",
      title: dailyLimit
        ? "Daily image limit reached"
        : "Request temporarily unavailable",
      message: dailyLimit
        ? "The free Cloudflare Workers AI allocation for today has been used. The quota resets daily at 00:00 UTC."
        : "The AI provider is temporarily rate-limited or out of capacity. Try again shortly.",
      retryable: !dailyLimit,
    };
  }
  if (status === 404 || lowered.includes("model") && lowered.includes("not found")) {
    return {
      code: "model_unavailable",
      title: "Model unavailable",
      message: message || "The selected model is currently unavailable.",
      retryable: true,
    };
  }
  if (status === 413) {
    return {
      code: "file_too_large",
      title: "Attachment too large",
      message: message || "The attached file is too large for this request.",
      retryable: false,
    };
  }
  if (status >= 500) {
    return {
      code: "provider_error",
      title: "Codarox AI temporarily unavailable",
      message:
        message ||
        "All configured AI routes are temporarily unavailable. Please try again shortly.",
      retryable: true,
    };
  }
  return {
    code: "request_error",
    title: "Request failed",
    message: message || `Request failed (${status}).`,
    retryable: true,
  };
}
