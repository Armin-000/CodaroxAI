import { env } from "../../../config/env.js";
import { parseDataUrl } from "../../documents/documentService.js";

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

function dimensionsForAspectRatio(value) {
  switch (String(value || "1:1")) {
    case "16:9":
      return { width: 1344, height: 768 };
    case "9:16":
      return { width: 768, height: 1344 };
    case "4:3":
      return { width: 1152, height: 864 };
    case "3:4":
      return { width: 864, height: 1152 };
    default:
      return { width: 1024, height: 1024 };
  }
}

function usesMultipart(model) {
  return /flux-2-(?:dev|klein)/i.test(String(model || ""));
}

function referenceBlob(dataUrl) {
  const parsed = parseDataUrl(dataUrl);

  if (!parsed?.mimeType?.startsWith("image/") || !parsed.data) {
    return null;
  }

  try {
    return {
      blob: new Blob(
        [Buffer.from(parsed.data, "base64")],
        { type: parsed.mimeType }
      ),
      mimeType: parsed.mimeType,
    };
  } catch {
    return null;
  }
}

function imageFilename(mimeType) {
  if (mimeType === "image/png") return "reference.png";
  if (mimeType === "image/webp") return "reference.webp";
  return "reference.jpg";
}

function buildEditPrompt(prompt) {
  return [
    "Use input_image_0 as the base image.",
    "Apply the requested edit while preserving the subject, composition, style, lighting and all unaffected details unless the instruction explicitly asks to change them.",
    `Requested edit: ${prompt}`,
  ].join(" ");
}

export async function generateCloudflareImage({
  prompt,
  sourceImage = "",
  aspectRatio = "1:1",
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

  const reference = sourceImage
    ? referenceBlob(sourceImage)
    : null;

  if (sourceImage && !reference) {
    return {
      ok: false,
      status: 400,
      error: "The reference image is invalid.",
    };
  }

  const editing = Boolean(reference);
  const model = editing
    ? env.cloudflareImageEditModel
    : env.cloudflareImageModel;
  const endpoint =
    "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(env.cloudflareAccountId) +
    "/ai/run/" +
    model;
  const { width, height } = dimensionsForAspectRatio(aspectRatio);

  let response;

  try {
    if (editing || usesMultipart(model)) {
      const form = new FormData();
      form.append("prompt", editing ? buildEditPrompt(cleanPrompt) : cleanPrompt);
      form.append("width", String(width));
      form.append("height", String(height));

      if (reference) {
        form.append(
          "input_image_0",
          reference.blob,
          imageFilename(reference.mimeType)
        );
      }

      response = await fetch(endpoint, {
        method: "POST",
        signal,
        headers: {
          Authorization:
            "Bearer " +
            env.cloudflareApiToken,
        },
        body: form,
      });
    } else {
      response = await fetch(endpoint, {
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
      });
    }
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
    mode: editing ? "edit" : "generate",
    mimeType: "image/jpeg",
    dataUrl:
      "data:image/jpeg;base64," +
      base64,
  };
}
