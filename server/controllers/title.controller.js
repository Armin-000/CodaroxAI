import { generateTitle } from "../services/ai/titleService.js";

export async function titleController(req, res) {
  const text = String(req.body?.text || "").trim().slice(0, 3000);
  if (!text) return res.status(400).json({ error: "Text is required." });
  try {
    const result = await generateTitle({ text, language: req.body?.language, origin: req.headers.origin });
    if (!result.ok) return res.status(result.status || 502).json({ error: result.error });
    return res.json({ title: result.title });
  } catch (error) {
    console.error("Title generation error:", error);
    return res.status(502).json({ error: "Unable to generate a chat title." });
  }
}
