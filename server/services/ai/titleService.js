import { env } from "../../config/env.js";
import { readProviderError } from "../../utils/http.js";

export async function generateTitle({ text, language, origin }) {
  if (!env.openRouterApiKey) return { ok: false, status: 503, error: "OPENROUTER_API_KEY is not configured." };
  const languageName = language === "hr" ? "Croatian" : language === "en" ? "English" : "the same language as the user";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": origin || "http://localhost:5173",
      "X-Title": env.appName,
    },
    body: JSON.stringify({
      model: env.openRouterModel,
      stream: false,
      temperature: 0.2,
      max_tokens: 32,
      messages: [
        { role: "system", content: `Create a concise chat title in ${languageName}. Return only the title, no quotes, maximum 6 words.` },
        { role: "user", content: text },
      ],
    }),
  });
  if (!response.ok) return { ok: false, status: response.status, error: await readProviderError(response) };
  const data = await response.json();
  const title = String(data?.choices?.[0]?.message?.content || "")
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);
  return { ok: true, title };
}
