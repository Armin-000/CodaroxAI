import { env } from "../../../config/env.js";

function cloudflareError(payload, fallback) {
  const errors = Array.isArray(payload?.errors)
    ? payload.errors
    : [];

  const first = errors[0];

  return (
    first?.message ||
    first?.code ||
    fallback
  );
}

export async function generateCloudflareImage({
  prompt,
  signal,
}) {
  if (
    !env.cloudflareAccountId ||
    !env.cloudflareApiToken
  ) {
    return {
      ok: false,
      status: 503,
      error:
        "Cloudflare Workers AI credentials are not configured.",
    };
  }

  const cleanPrompt = String(prompt || "")
    .trim()
    .slice(0, 2048);

  if (!cleanPrompt) {
    return {
      ok: false,
      status: 400,
      error: "Image prompt is required.",
    };
  }

  const model =
    env.cloudflareImageModel;

  const endpoint =
    "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(env.cloudflareAccountId) +
    "/ai/run/" +
    model;

  let response;

  try {
    response = await fetch(
      endpoint,
      {
        method: "POST",
        signal,
        headers: {
          Authorization:
            "Bearer " +
            env.cloudflareApiToken,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          prompt: cleanPrompt,
          steps: 4,
        }),
      }
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    return {
      ok: false,
      status: 502,
      error:
        "Unable to reach Cloudflare Workers AI.",
    };
  }

  const payload =
    await response
      .json()
      .catch(() => ({}));

  if (
    !response.ok ||
    payload?.success === false
  ) {
    return {
      ok: false,
      status:
        response.status || 502,
      error:
        cloudflareError(
          payload,
          "Cloudflare Workers AI returned an error."
        ),
    };
  }

  const base64 =
    typeof payload?.result?.image === "string"
      ? payload.result.image.trim()
      : "";

  if (!base64) {
    return {
      ok: false,
      status: 502,
      error:
        "Cloudflare returned no generated image.",
    };
  }

  return {
    ok: true,
    provider: "Cloudflare Workers AI",
    model,
    mimeType: "image/jpeg",
    dataUrl:
      "data:image/jpeg;base64," +
      base64,
  };
}
