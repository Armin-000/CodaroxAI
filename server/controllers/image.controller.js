import { generateCloudflareImage } from "../services/ai/providers/cloudflare-image.provider.js";
import { errorCodeForStatus } from "../utils/http.js";

export async function generateImageController(req, res) {
  const controller = new AbortController();

  res.on("close", () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    const result = await generateCloudflareImage({
        prompt: req.body?.prompt,
        sourceImage: req.body?.sourceImage,
        aspectRatio: req.body?.aspectRatio,
        signal: controller.signal,
      });

    if (!result.ok) {
      const status = result.status || 502;

      return res.status(status).json({
        code: errorCodeForStatus(status),
        error:
          result.error ||
          "Unable to generate image.",
      });
    }

    return res.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      mimeType: result.mimeType,
      dataUrl: result.dataUrl,
      mode: result.mode,
      usage: result.usage,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    console.error(
      "Image generation controller error:",
      error
    );

    return res.status(502).json({
      code: "provider_error",
      error: "Unable to generate image.",
    });
  }
}
