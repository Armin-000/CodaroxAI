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
    .map((message) => {
      const generatedPrompt = String(
        message?.imagePrompt ||
        message?.generatedImage?.prompt ||
        ""
      ).trim();

      const generatedImageContext = message?.generatedImage
        ? `[Codarox AI ${message.generationMode === "image-edit" ? "edited" : "generated"} an image in this turn${generatedPrompt ? ` from this instruction: ${generatedPrompt}` : ""}.]`
        : "";

      const content = [
        typeof message.content === "string" ? message.content : "",
        generatedImageContext,
      ].filter(Boolean).join("\n\n");

      return {
        role: message.role,
        content,
        attachments: Array.isArray(message.attachments)
          ? message.attachments.filter((attachment) => attachment.kind === "image" && attachment.data)
          : [],
      };
    });
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


function attachmentHasReplayPayload(attachment) {
  if (!attachment || typeof attachment !== "object") return true;

  if (attachment.kind === "image") {
    return typeof attachment.data === "string" && attachment.data.startsWith("data:image/");
  }

  if (attachment.kind === "pdf") {
    return typeof attachment.data === "string" && attachment.data.startsWith("data:application/pdf;base64,");
  }

  if (attachment.kind === "text") {
    return typeof attachment.text === "string";
  }

  return true;
}

export function getConversationReplayStatus(conversation) {
  const messages = Array.isArray(conversation) ? conversation : [];
  let requiresVision = false;

  for (const message of messages) {
    if (message?.role !== "user" || !Array.isArray(message.attachments)) continue;

    for (const attachment of message.attachments) {
      if (attachment?.kind === "image" && attachmentHasReplayPayload(attachment)) {
        requiresVision = true;
      }

      if (!attachmentHasReplayPayload(attachment)) {
        return {
          replayable: false,
          requiresVision,
          reason: "Original attachment data is no longer available after this chat was reloaded.",
        };
      }
    }
  }

  return {
    replayable: true,
    requiresVision,
    reason: "",
  };
}

export function documentsFromMessages(conversation) {
  const documents = [];

  for (const message of Array.isArray(conversation) ? conversation : []) {
    if (message?.role !== "user" || !Array.isArray(message.attachments)) continue;

    for (const attachment of message.attachments) {
      if (attachment?.kind !== "pdf" && attachment?.kind !== "text") continue;

      const index = documents.findIndex(
        (item) => item.name === attachment.name && item.kind === attachment.kind
      );

      if (index >= 0) documents[index] = attachment;
      else documents.push(attachment);
    }
  }

  return documents.slice(-4);
}

export function generatedImageStorageKeys(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.generatedImage)
    .map((message) => message.generatedImage.storageKey || message.id)
    .filter(Boolean);
}
