import { attachmentData, buildOpenRouterDocumentParts, parseDataUrl } from "../documents/documentService.js";
import { buildSystemPrompt } from "../../prompts/systemPrompt.js";

export function normalizeSettings(raw = {}) {
  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };
  return {
    language: ["auto", "hr", "en"].includes(raw.language) ? raw.language : "auto",
    temperature: clamp(raw.temperature, 0, 1.2, 0.35),
    maxTokens: Math.round(clamp(raw.maxTokens, 512, 32768, 8192)),
    systemInstructions: String(raw.systemInstructions || "").slice(0, 3000),
  };
}

export function rawMessages(body) {
  return Array.isArray(body?.messages)
    ? body.messages.filter((message) => message && ["user", "assistant"].includes(message.role)).slice(-24)
    : [];
}

export function activeDocuments(body) {
  if (Array.isArray(body?.documents)) return body.documents;
  if (Array.isArray(body?.activeDocuments)) return body.activeDocuments;
  return [];
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => {
    if (typeof part === "string") return part;
    if (part?.type === "text" && typeof part?.text === "string") return part.text;
    return "";
  }).filter(Boolean).join("\n");
}

function collectMedia(message) {
  const media = [];
  if (Array.isArray(message?.attachments)) {
    for (const attachment of message.attachments) {
      const parsed = attachmentData(attachment);
      if (parsed) media.push({ ...parsed, name: attachment?.name || attachment?.filename || "attachment" });
    }
  }
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part?.type === "image_url") {
        const value = typeof part.image_url === "string" ? part.image_url : part.image_url?.url;
        const parsed = parseDataUrl(value);
        if (parsed) media.push(parsed);
      }
    }
  }
  return media;
}

export async function buildOpenRouterPayload(body, modelConfig) {
  const settings = normalizeSettings(body?.settings);
  const messages = [{ role: "system", content: buildSystemPrompt(settings, {
    hasDocuments: activeDocuments(body).length > 0,
    hasGeneratedImages: Boolean(body?.productContext?.hasGeneratedImages),
  }) }];

  for (const message of rawMessages(body)) {
    const text = textFromContent(message.content).trim();
    const media = collectMedia(message);
    if (modelConfig.textOnly || !media.length) {
      messages.push({
        role: message.role,
        content: text || (modelConfig.textOnly && media.length
          ? "[Visual attachments were omitted because this model is text-only.]"
          : "(empty message)"),
      });
      continue;
    }

    const content = [];
    if (text) content.push({ type: "text", text });
    for (const item of media) {
      if (item.mimeType?.startsWith("image/")) {
        content.push({ type: "image_url", image_url: { url: `data:${item.mimeType};base64,${item.data}` } });
      }
    }
    messages.push({ role: message.role, content: content.length ? content : text || "(empty message)" });
  }

  const builtDocs = await buildOpenRouterDocumentParts(activeDocuments(body));
  if (builtDocs.parts.length) {
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") { lastUserIndex = i; break; }
    }
    if (lastUserIndex >= 0) {
      const existing = messages[lastUserIndex].content;
      const normalized = Array.isArray(existing) ? existing : [{ type: "text", text: String(existing || "") }];
      messages[lastUserIndex] = {
        role: "user",
        content: [
          ...normalized,
          { type: "text", text: "\n\nUse the active document sources below when relevant. Preserve source/page markers when citing them." },
          ...builtDocs.parts,
        ],
      };
    }
  }

  return { settings, messages, needsPdfParser: builtDocs.needsPdfParser };
}

export function buildGeminiPayload(body) {
  const settings = normalizeSettings(body?.settings);
  const contents = rawMessages(body).map((message) => {
    const parts = [];
    const text = textFromContent(message.content).trim();
    if (text) parts.push({ text });
    for (const media of collectMedia(message)) {
      parts.push({ inline_data: { mime_type: media.mimeType, data: media.data } });
    }
    if (!parts.length) parts.push({ text: "(empty message)" });
    return { role: message.role === "assistant" ? "model" : "user", parts };
  });

  const docs = activeDocuments(body);
  if (docs.length) {
    let lastUser = [...contents].reverse().find((item) => item.role === "user");
    if (!lastUser) {
      lastUser = { role: "user", parts: [] };
      contents.push(lastUser);
    }
    for (const doc of docs) {
      const name = doc?.name || doc?.filename || "document";
      const text = typeof doc?.text === "string" ? doc.text.trim() : typeof doc?.content === "string" ? doc.content.trim() : "";
      if (text) {
        lastUser.parts.push({ text: `\n[Active document: ${name}]\n${text}` });
        continue;
      }
      const parsed = attachmentData(doc);
      if (parsed) lastUser.parts.push({ inline_data: { mime_type: parsed.mimeType, data: parsed.data } });
    }
  }

  return {
    settings,
    systemInstruction: buildSystemPrompt(settings, {
      hasDocuments: docs.length > 0,
      hasGeneratedImages: Boolean(body?.productContext?.hasGeneratedImages),
    }),
    contents,
  };
}
