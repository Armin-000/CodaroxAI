import crypto from "node:crypto";

const pdfCache = new Map();

function cleanFilename(value) {
  return String(value || "document").replace(/[\r\n<>]/g, " ").slice(0, 180);
}

function decodeDataUrl(dataUrl, expectedPrefix = "") {
  const text = String(dataUrl || "");
  if (expectedPrefix && !text.startsWith(expectedPrefix)) return null;
  const comma = text.indexOf(",");
  if (comma < 0) return null;
  try {
    return Buffer.from(text.slice(comma + 1), "base64");
  } catch {
    return null;
  }
}

export async function extractPdfPages(dataUrl) {
  const buffer = decodeDataUrl(dataUrl, "data:application/pdf;base64,");
  if (!buffer?.length) return null;
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  if (pdfCache.has(hash)) return pdfCache.get(hash);

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 250); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => typeof item?.str === "string" ? item.str : "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push({ page: pageNumber, text: text.slice(0, 16000) });
    }
    const result = { pages, pageCount: pdf.numPages };
    pdfCache.set(hash, result);
    if (pdfCache.size > 20) pdfCache.delete(pdfCache.keys().next().value);
    return result;
  } catch (error) {
    console.warn("PDF text extraction failed:", error?.message || error);
    return null;
  }
}

export async function buildOpenRouterDocumentParts(documents = []) {
  const parts = [];
  let needsPdfParser = false;
  let totalChars = 0;

  for (const document of Array.isArray(documents) ? documents.slice(0, 4) : []) {
    if (!document || typeof document !== "object") continue;
    const name = cleanFilename(document.name);

    if (document.kind === "text" && typeof document.text === "string") {
      const remaining = Math.max(0, 450000 - totalChars);
      if (!remaining) break;
      const text = document.text.slice(0, Math.min(180000, remaining));
      totalChars += text.length;
      parts.push({ type: "text", text: `\n\n[SOURCE FILE: ${name}]\n${text}\n[END SOURCE FILE: ${name}]` });
      continue;
    }

    if (document.kind === "pdf" && typeof document.data === "string") {
      const extracted = await extractPdfPages(document.data);
      const usablePages = extracted?.pages?.filter((page) => page.text?.trim()) || [];
      const extractedChars = usablePages.reduce((sum, page) => sum + page.text.length, 0);

      if (extracted && extractedChars >= 80) {
        let source = `\n\n[SOURCE PDF: ${name}; TOTAL PAGES: ${extracted.pageCount}]\n`;
        for (const page of extracted.pages) {
          if (!page.text) continue;
          const marker = `[SOURCE: ${name} | PAGE ${page.page}]\n`;
          const remaining = Math.max(0, 450000 - totalChars - source.length);
          if (!remaining) break;
          source += `${marker}${page.text.slice(0, remaining)}\n`;
        }
        source += `[END SOURCE PDF: ${name}]`;
        totalChars += source.length;
        parts.push({ type: "text", text: source });
      } else if (document.data.startsWith("data:application/pdf;base64,") && document.data.length <= 12_000_000) {
        needsPdfParser = true;
        parts.push({ type: "file", file: { filename: name, file_data: document.data } });
      }
    }
  }

  return { parts, needsPdfParser };
}

export function parseDataUrl(value) {
  if (typeof value !== "string" || !value.startsWith("data:")) return null;
  const match = value.match(/^data:([^;,]+);base64,(.+)$/s);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

export function attachmentData(item) {
  if (!item || typeof item !== "object") return null;
  for (const candidate of [item.dataUrl, item.data, item.url, item.fileData, item.file_data]) {
    const parsed = parseDataUrl(candidate);
    if (parsed) return parsed;
  }
  if (typeof item.data === "string" && item.mimeType && !item.data.startsWith("data:")) {
    return { mimeType: item.mimeType, data: item.data };
  }
  return null;
}
