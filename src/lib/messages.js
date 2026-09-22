export function mergeDocuments(current, incoming) {
  const merged = [...(Array.isArray(current) ? current : [])];
  for (const document of Array.isArray(incoming) ? incoming : []) {
    const index = merged.findIndex((item) => item.name === document.name && item.kind === document.kind);
    if (index >= 0) merged[index] = document;
    else merged.push(document);
  }
  return merged.slice(-4);
}

export function apiMessages(conversation) {
  return conversation
    .filter((message) => message.id !== "welcome" && !message.localNotice)
    .map(({ role, content, attachments }) => ({
      role,
      content,
      attachments: Array.isArray(attachments)
        ? attachments.filter((attachment) => attachment.kind === "image" && attachment.data)
        : [],
    }));
}

export function cleanConversationCopy(selection) {
  return String(selection || "")
    .replace(/\[image\]\(https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/favicon[^)]*\)/gi, "")
    .replace(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/favicon(?:-light|-dark)?\.svg/gi, "")
    .replace(/\b(?:svg){2,}\b/gi, "")
    .replace(/^\s*svg\s*$/gim, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
