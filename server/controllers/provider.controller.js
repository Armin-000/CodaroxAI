import { env } from "../config/env.js";

export async function openRouterStatusController(_req, res) {
  if (!env.openRouterApiKey) return res.status(503).json({ ok: false, error: "OPENROUTER_API_KEY is not configured." });
  try {
    const response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${env.openRouterApiKey}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ ok: false, error: payload?.error?.message || payload?.message || `OpenRouter status failed (${response.status}).` });
    }
    const data = payload?.data || {};
    return res.json({
      ok: true,
      isFreeTier: Boolean(data.is_free_tier),
      usage: Number(data.usage || 0),
      usageDaily: Number(data.usage_daily || 0),
      usageWeekly: Number(data.usage_weekly || 0),
      usageMonthly: Number(data.usage_monthly || 0),
      limit: typeof data.limit === "number" ? data.limit : null,
      limitRemaining: typeof data.limit_remaining === "number" ? data.limit_remaining : null,
      limitReset: data.limit_reset || null,
      expiresAt: data.expires_at || null,
    });
  } catch (error) {
    console.error("OpenRouter status error:", error);
    return res.status(502).json({ ok: false, error: "Unable to read OpenRouter key status." });
  }
}
