import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const app = express();
const PORT = Number(process.env.PORT || 8787);
const CONTEXT_LIMIT = Number(process.env.CONTEXT_LIMIT || 262144);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// 262K tokens can be close to / above 1 MB of JSON depending on the text.
app.use(express.json({ limit: "8mb" }));

const SYSTEM_PROMPT = `You are Codarox AI, a polished, helpful assistant.
Reply in the same language the user uses unless they ask for another language.
Be clear, useful, concise when possible, and friendly without being verbose.
Use Markdown when it improves readability.
Never pretend you performed actions you did not perform.`;

const DEFAULT_MODEL = "qwen/qwen3-next-80b-a3b-instruct:free";

function selectedModel() {
  return (process.env.OPENROUTER_MODEL || DEFAULT_MODEL).trim();
}

function normalizeMessages(messages = []) {
  // Keep the full conversation in the UI/history, but only send the latest
  // 24 messages to the model. This prevents prompt-prefill latency from
  // growing on every turn while preserving enough recent conversational context.
  return messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-24)
    .map((m) => ({ role: m.role, content: m.content }));
}

function extractDeltaContent(parsed) {
  const value = parsed?.choices?.[0]?.delta?.content;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return part?.text || "";
        return "";
      })
      .join("");
  }
  return "";
}

async function readProviderError(response) {
  const text = await response.text().catch(() => "");
  if (!text) return `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(text);
    return parsed?.error?.message || parsed?.message || text;
  } catch {
    return text;
  }
}

function writeEvent(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    provider: "OpenRouter",
    model: selectedModel(),
    contextLimit: CONTEXT_LIMIT,
  });
});

app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY is missing. Copy .env.example to .env and add your key.",
    });
  }

  const messages = normalizeMessages(req.body?.messages);
  if (!messages.length) {
    return res.status(400).json({ error: "No valid messages supplied." });
  }

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    // One direct model request. Avoid cross-model fallback so a slow fallback cannot silently take over a chat turn.
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.origin || "http://localhost:5173",
        "X-Title": process.env.APP_NAME || "Codarox AI",
      },
      body: JSON.stringify({
        model: selectedModel(),
        stream: true,
        usage: { include: true },
        temperature: 0.7,
        max_tokens: 2048,
        // For an interactive chat, prioritize time-to-first-token. OpenRouter can
        // still fall back between providers serving this same model.
        provider: { sort: "latency", allow_fallbacks: true },
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).json({
        error: await readProviderError(upstream),
      });
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let actualModel = selectedModel();
    let emitted = false;
    let lastUsage = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          if (parsed?.model) actualModel = parsed.model;

          if (parsed?.error) {
            writeEvent(res, {
              type: "error",
              message: parsed.error.message || "Provider returned an error.",
            });
            continue;
          }

          const delta = extractDeltaContent(parsed);
          if (delta) {
            writeEvent(res, { type: "delta", text: delta });
            emitted = true;
          }

          if (parsed?.usage) {
            lastUsage = parsed.usage;
            writeEvent(res, {
              type: "usage",
              model: actualModel,
              contextLimit: CONTEXT_LIMIT,
              usage: {
                promptTokens: Number(parsed.usage.prompt_tokens || 0),
                completionTokens: Number(parsed.usage.completion_tokens || 0),
                totalTokens: Number(parsed.usage.total_tokens || 0),
              },
            });
          }
        } catch {
          // Ignore malformed/non-JSON provider metadata.
        }
      }
    }

    // Some providers may not emit usage even when requested. The UI keeps the
    // last known value instead of inventing token counts.
    writeEvent(res, {
      type: "done",
      model: actualModel,
      contextLimit: CONTEXT_LIMIT,
      hasUsage: Boolean(lastUsage),
      emitted,
    });
    return res.end();
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error(error);
    if (!res.headersSent) {
      return res.status(502).json({
        error: "Unable to reach the AI provider. Check your API key and network connection.",
      });
    }
    writeEvent(res, { type: "error", message: "The AI stream was interrupted." });
    res.end();
  }
});

const distPath = path.join(projectRoot, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Codarox AI API running on http://localhost:${PORT}`);
  console.log(`Model: ${selectedModel()}`);
  console.log(`Conversation context safety limit: ${CONTEXT_LIMIT.toLocaleString()} tokens`);
});
