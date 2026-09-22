export function friendlyError(status, message = "") {
  const lowered = String(message || "").toLowerCase();
  if (status === 429) {
    return {
      code: "rate_limit",
      title: "Request temporarily unavailable",
      message: "The AI provider returned a rate-limit response. This can be temporary, provider capacity, or a daily quota. Try again shortly.",
      retryable: true,
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
      title: "AI provider unavailable",
      message: message || "The AI provider is temporarily unavailable. Please try again.",
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
