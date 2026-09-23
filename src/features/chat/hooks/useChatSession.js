import { useEffect, useMemo, useRef, useState } from "react";
import {
  CONTEXT_DANGER_AT,
  CONTEXT_HARD_STOP_AT,
  CONTEXT_WARNING_AT,
  DEFAULT_CONTEXT_LIMIT,
  INITIAL_MESSAGE,
  STORAGE_KEYS,
} from "../../../config/constants.js";
import { emptyContextUsage } from "../../../lib/context.js";
import { friendlyError } from "../../../lib/errors.js";
import { formatTokens, shortTitle } from "../../../lib/format.js";
import { createId } from "../../../lib/ids.js";
import { apiMessages, cleanConversationCopy, mergeDocuments } from "../../../lib/messages.js";
import { loadRequestUsage, localDayKey, sanitizeMessageForStorage } from "../../../lib/storage.js";
import { getGeneratedImage, putGeneratedImage } from "../../../lib/imageStore.js";

function generatedImageFileName(prompt = "", mimeType = "image/jpeg") {
  const clean = String(prompt || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const extension =
    mimeType === "image/png"
      ? "png"
      : "jpg";

  return "codarox-" + (clean || "generated-image") + "." + extension;
}

export function useChatSession({
  settings,
  attachments,
  setAttachments,
  activeDocuments,
  setActiveDocuments,
  history,
  setHistory,
  speak,
  shouldSpeak,
}) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [copied, setCopied] = useState(null);
  const [activeTitle, setActiveTitle] = useState("New conversation");
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [contextUsage, setContextUsage] = useState(emptyContextUsage);
  const [requestUsage, setRequestUsage] = useState(loadRequestUsage);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const firstResponseTitledRef = useRef(new Set());
  const historyHydrationRef = useRef(0);

  const hasUserMessages = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages]
  );

  const contextPercent = useMemo(() => {
    const limit = Math.max(1, Number(contextUsage.contextLimit || DEFAULT_CONTEXT_LIMIT));
    return Math.min(100, (Number(contextUsage.totalTokens || 0) / limit) * 100);
  }, [contextUsage]);

  const contextState = contextPercent >= CONTEXT_HARD_STOP_AT * 100
    ? "full"
    : contextPercent >= CONTEXT_DANGER_AT * 100
      ? "danger"
      : contextPercent >= CONTEXT_WARNING_AT * 100
        ? "warning"
        : "normal";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(requestUsage));
  }, [requestUsage]);

  useEffect(() => {
    const registry = new Map();
    for (const message of messages) {
      if (!Array.isArray(message?.attachments)) continue;
      for (const attachment of message.attachments) {
        if (
          attachment?.kind === "pdf" &&
          typeof attachment?.name === "string" &&
          typeof attachment?.data === "string" &&
          attachment.data.startsWith("data:application/pdf;base64,")
        ) {
          registry.set(attachment.name, attachment.data);
        }
      }
    }
    window.__codaroxPdfRegistry = registry;
    return () => {
      if (window.__codaroxPdfRegistry === registry) window.__codaroxPdfRegistry = new Map();
    };
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (streaming || !hasUserMessages) return;
    const id = activeHistoryId || createId();
    if (!activeHistoryId) setActiveHistoryId(id);
    const firstUserMessage = messages.find((message) => message.role === "user");
    const entry = {
      id,
      title: activeTitle,
      preview: firstUserMessage?.content || "",
      messages: messages.map(sanitizeMessageForStorage),
      contextUsage,
      documentNames: activeDocuments.map((doc) => doc.name),
      updatedAt: Date.now(),
    };
    setHistory((items) => [entry, ...items.filter((item) => item.id !== id)].slice(0, 40));
  }, [
    streaming,
    hasUserMessages,
    messages,
    activeTitle,
    activeHistoryId,
    contextUsage,
    activeDocuments,
    setHistory,
  ]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => () => abortRef.current?.abort?.(), []);

  function incrementRequestCount() {
    const today = localDayKey();
    setRequestUsage((current) => current.date !== today
      ? { date: today, count: 1 }
      : { date: today, count: current.count + 1 });
  }

  function resetChat() {
    historyHydrationRef.current += 1;
    abortRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setAttachments([]);
    setActiveDocuments([]);
    setActiveTitle("New conversation");
    setActiveHistoryId(null);
    setContextUsage(emptyContextUsage());
    setImageMode(false);
    setStreaming(false);
  }

  function openHistory(item) {
    historyHydrationRef.current += 1;

    const hydrationId =
      historyHydrationRef.current;

    abortRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();

    const restoredMessages =
      Array.isArray(item.messages) &&
      item.messages.length
        ? item.messages
        : [
            INITIAL_MESSAGE,
            {
              id: createId(),
              role: "user",
              content:
                item.preview ||
                item.title,
            },
          ];

    setMessages(restoredMessages);
    setInput("");
    setAttachments([]);
    setActiveDocuments([]);
    setActiveTitle(
      item.title ||
      "Conversation"
    );
    setActiveHistoryId(item.id);
    setContextUsage(
      item.contextUsage ||
      emptyContextUsage()
    );
    setImageMode(false);
    setStreaming(false);

    const hasStoredImages =
      restoredMessages.some(
        (message) =>
          message?.generatedImage &&
          !message.generatedImage.dataUrl
      );

    if (!hasStoredImages) {
      return;
    }

    Promise.all(
      restoredMessages.map(
        async (message) => {
          if (
            !message?.generatedImage ||
            message.generatedImage.dataUrl
          ) {
            return message;
          }

          const storageKey =
            message.generatedImage.storageKey ||
            message.id;

          try {
            const stored =
              await getGeneratedImage(
                storageKey
              );

            if (!stored?.dataUrl) {
              return message;
            }

            return {
              ...message,
              generatedImage: {
                ...message.generatedImage,
                dataUrl:
                  stored.dataUrl,
                mimeType:
                  stored.mimeType ||
                  message.generatedImage.mimeType ||
                  "image/jpeg",
                prompt:
                  stored.prompt ||
                  message.generatedImage.prompt ||
                  message.imagePrompt ||
                  "",
                storageKey,
              },
            };
          } catch (error) {
            console.warn(
              "Unable to restore generated image:",
              error
            );

            return message;
          }
        }
      )
    ).then(
      (hydratedMessages) => {
        if (
          historyHydrationRef.current !==
          hydrationId
        ) {
          return;
        }

        setMessages(
          hydratedMessages
        );
      }
    );
  }

  function apiPayloadMessages(conversation) {
    return apiMessages(conversation);
  }

  async function runStream({
    conversation,
    targetId,
    documents,
    append = false,
    hiddenInstruction = "",
    silentRetry = 0,
  }) {
    const target = conversation.find((message) => message.id === targetId) || messages.find((message) => message.id === targetId);
    const initialText = append && target?.content
      ? `${target.content}${target.content.endsWith("\n") ? "" : "\n\n"}`
      : "";
    let fullText = initialText;
    let finishReason = null;
    let streamError = null;

    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    if (silentRetry === 0) incrementRequestCount();

    try {
      const payloadMessages = apiPayloadMessages(conversation);
      if (hiddenInstruction) payloadMessages.push({ role: "user", content: hiddenInstruction, attachments: [] });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.model || "auto",
          messages: payloadMessages,
          documents,
          settings: {
            language: settings.language,
            temperature: Number(settings.temperature),
            maxTokens: Number(settings.maxTokens),
            systemInstructions: settings.systemInstructions,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        const transientStatus = [
          408,
          500,
          502,
          503,
          504,
        ].includes(response.status);

        if (
          transientStatus &&
          silentRetry < 1 &&
          !controller.signal.aborted
        ) {
          console.warn(
            `Transient AI HTTP ${response.status}; retrying once automatically.`
          );

          await new Promise((resolve) =>
            window.setTimeout(resolve, 700)
          );

          return runStream({
            conversation,
            targetId,
            documents,
            append,
            hiddenInstruction,
            silentRetry: silentRetry + 1,
          });
        }

        const info = friendlyError(
          response.status,
          data.error || data.message || ""
        );

        setMessages((current) =>
          current.map((message) =>
            message.id === targetId
              ? {
                  ...message,
                  content: "",
                  error: info,
                  finishReason: null,
                }
              : message
          )
        );

        return { ok: false, error: info };
      }

      if (!response.body) throw new Error("Streaming is not available in this browser.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const consumeLine = (line) => {
        if (!line.trim()) return;
        let event;
        try { event = JSON.parse(line); } catch { return; }

        if (event.type === "delta" && typeof event.text === "string") {
          fullText += event.text;
          setMessages((current) => current.map((message) =>
            message.id === targetId ? { ...message, content: fullText, error: null } : message
          ));
        }

        if (event.type === "replace" && typeof event.text === "string") {
          fullText = event.text;
          setMessages((current) => current.map((message) =>
            message.id === targetId ? { ...message, content: fullText, error: null } : message
          ));
        }

        if (event.type === "usage" && event.usage) {
          setContextUsage({
            promptTokens: Number(event.usage.promptTokens || 0),
            completionTokens: Number(event.usage.completionTokens || 0),
            totalTokens: Number(event.usage.totalTokens || 0),
            contextLimit: Number(event.contextLimit || DEFAULT_CONTEXT_LIMIT),
            model: event.model || null,
          });
        }

        if (event.type === "done") {
          finishReason = event.finishReason || null;

          setMessages((current) => current.map((message) =>
            message.id === targetId
              ? {
                  ...message,
                  finishReason,
                  error: null,
                  provider: event.provider || null,
                  model: event.model || null,
                }
              : message
          ));
        }

        if (event.type === "error") {
          streamError = event.message || "The provider interrupted the response.";
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) consumeLine(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consumeLine(buffer);

      if (streamError && !fullText.trim()) {

        if (
          silentRetry < 1 &&
          !controller.signal.aborted
        ) {
          console.warn(
            "AI stream failed before first token; retrying once automatically."
          );

          await new Promise((resolve) =>
            window.setTimeout(resolve, 700)
          );

          return runStream({
            conversation,
            targetId,
            documents,
            append,
            hiddenInstruction,
            silentRetry: silentRetry + 1,
          });
        }

        const info = friendlyError(502, streamError);

        setMessages((current) =>
          current.map((message) =>
            message.id === targetId
              ? {
                  ...message,
                  content: "",
                  error: info,
                }
              : message
          )
        );

        return { ok: false, error: info };
      }

      if (streamError && fullText.trim()) {
        setMessages((current) => current.map((message) =>
          message.id === targetId
            ? { ...message, content: fullText, interrupted: true, finishReason }
            : message
        ));
      }

      if (shouldSpeak?.() && fullText.trim()) speak?.(fullText);
      return { ok: true, text: fullText, finishReason };
    } catch (error) {
      if (error?.name === "AbortError") {
        setMessages((current) => current.map((message) =>
          message.id === targetId
            ? { ...message, content: fullText || "_Generation stopped._", interrupted: true, finishReason: "cancelled" }
            : message
        ));
        return { ok: false, aborted: true };
      }
      if (silentRetry < 1) {
        console.warn(
          "AI network request failed; retrying once automatically.",
          error
        );

        await new Promise((resolve) =>
          window.setTimeout(resolve, 700)
        );

        return runStream({
          conversation,
          targetId,
          documents,
          append,
          hiddenInstruction,
          silentRetry: silentRetry + 1,
        });
      }

      const info = friendlyError(502, error.message);

      setMessages((current) =>
        current.map((message) =>
          message.id === targetId
            ? {
                ...message,
                content: "",
                error: info,
              }
            : message
        )
      );

      return { ok: false, error: info };
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function runImageGeneration({
    prompt,
    targetId,
  }) {
    setStreaming(true);

    const controller =
      new AbortController();

    abortRef.current = controller;

    incrementRequestCount();

    try {
      const response =
        await fetch(
          "/api/images/generate",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            signal:
              controller.signal,
            body: JSON.stringify({
              prompt,
              aspectRatio: "1:1",
              outputFormat: "jpeg",
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        const info =
          friendlyError(
            response.status,
            data.error ||
            data.message ||
            ""
          );

        setMessages((current) =>
          current.map((message) =>
            message.id === targetId
              ? {
                  ...message,
                  content: "",
                  error: info,
                  finishReason: null,
                  generationMode: "image",
                }
              : message
          )
        );

        return {
          ok: false,
          error: info,
        };
      }

      const dataUrl =
        String(
          data.dataUrl || ""
        ).trim();

      if (
        !dataUrl.startsWith(
          "data:image/"
        )
      ) {
        throw new Error(
          "Image provider returned invalid image data."
        );
      }

      const generatedImage = {
        dataUrl,
        mimeType:
          data.mimeType ||
          "image/jpeg",
        prompt,
        storageKey:
          targetId,
      };

      try {
        await putGeneratedImage(
          targetId,
          generatedImage
        );
      } catch (error) {
        console.warn(
          "Unable to persist generated image:",
          error
        );
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === targetId
            ? {
                ...message,
                content:
                  "Generated image",
                error: null,
                finishReason:
                  "image",
                generationMode:
                  "image",
                imagePrompt:
                  prompt,
                provider:
                  data.provider ||
                  "Cloudflare Workers AI",
                model:
                  data.model ||
                  null,
                generatedImage,
              }
            : message
        )
      );

      return {
        ok: true,
        dataUrl,
      };
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        setMessages((current) =>
          current.map((message) =>
            message.id === targetId
              ? {
                  ...message,
                  content:
                    "_Image generation stopped._",
                  interrupted: true,
                  finishReason:
                    "cancelled",
                  generationMode:
                    "image",
                }
              : message
          )
        );

        return {
          ok: false,
          aborted: true,
        };
      }

      const info =
        friendlyError(
          502,
          error?.message ||
          "Unable to generate image."
        );

      setMessages((current) =>
        current.map((message) =>
          message.id === targetId
            ? {
                ...message,
                content: "",
                error: info,
                generationMode:
                  "image",
              }
            : message
        )
      );

      return {
        ok: false,
        error: info,
      };
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function maybeGenerateAITitle(firstUserText, conversationId) {
    if (!settings.aiTitles || !firstUserText || firstResponseTitledRef.current.has(conversationId)) return;
    firstResponseTitledRef.current.add(conversationId);
    incrementRequestCount();
    try {
      const response = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: firstUserText, language: settings.language }),
      });
      if (!response.ok) return;
      const data = await response.json();
      const title = String(data.title || "").trim();
      if (!title) return;
      setActiveTitle(title);
      setHistory((items) => items.map((item) => item.id === conversationId ? { ...item, title } : item));
    } catch {}
  }

  async function submitMessage(rawText = input) {
    const text = String(rawText || "").trim();
    const selectedAttachments = attachments;
    if ((!text && selectedAttachments.length === 0) || streaming) return;

    if (contextPercent >= CONTEXT_HARD_STOP_AT * 100) {
      const warningText = `**This conversation has reached its safe context limit.**\n\nYou have used about **${formatTokens(contextUsage.totalTokens)} / ${formatTokens(contextUsage.contextLimit)} tokens**. Start a **New chat** to continue with a fresh context window.`;
      setMessages((current) => [...current, { id: createId(), role: "assistant", content: warningText, localNotice: true }]);
      return;
    }

    const effectiveText = text || "Please analyze the attached file or files.";
    const isFirstTurn = !hasUserMessages;

    if (imageMode) {
      if (!text) return;

      if (
        selectedAttachments.length > 0
      ) {
        window.alert(
          "Create image V1 currently uses text prompts only. Remove attachments first."
        );
        return;
      }

      const userMessage = {
        id: createId(),
        role: "user",
        content: text,
        attachments: [],
      };

      const assistantMessage = {
        id: createId(),
        role: "assistant",
        content: "",
        finishReason: null,
        error: null,
        provider: null,
        model: null,
        generationMode: "image",
        imagePrompt: text,
      };

      const outgoing = [
        ...messages,
        userMessage,
      ];

      const nextConversationId =
        activeHistoryId ||
        createId();

      if (!activeHistoryId) {
        setActiveHistoryId(
          nextConversationId
        );
      }

      if (isFirstTurn) {
        setActiveTitle(
          shortTitle(text)
        );
      }

      setInput("");
      setAttachments([]);
      setImageMode(false);

      setMessages([
        ...outgoing,
        assistantMessage,
      ]);

      const result =
        await runImageGeneration({
          prompt: text,
          targetId:
            assistantMessage.id,
        });

      if (
        isFirstTurn &&
        result?.ok
      ) {
        await maybeGenerateAITitle(
          text,
          nextConversationId
        );
      }

      return;
    }

    const docsFromAttachments = selectedAttachments.filter((item) => item.kind === "pdf" || item.kind === "text");
    const documentsForRequest = mergeDocuments(activeDocuments, docsFromAttachments);
    const userMessage = { id: createId(), role: "user", content: effectiveText, attachments: selectedAttachments };
    const assistantMessage = { id: createId(), role: "assistant", content: "", finishReason: null, error: null };
    const outgoing = [...messages, userMessage];
    const nextConversationId = activeHistoryId || createId();

    if (!activeHistoryId) setActiveHistoryId(nextConversationId);
    if (isFirstTurn) setActiveTitle(shortTitle(text || selectedAttachments.map((item) => item.name).join(", ")));

    setInput("");
    setAttachments([]);
    setActiveDocuments(documentsForRequest);
    setMessages([...outgoing, assistantMessage]);

    const result = await runStream({ conversation: outgoing, targetId: assistantMessage.id, documents: documentsForRequest });
    if (isFirstTurn && result?.ok) await maybeGenerateAITitle(effectiveText, nextConversationId);
  }

  async function continueMessage(messageId) {
    if (streaming) return;
    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;
    const conversation = messages.slice(0, index + 1).map((message) =>
      message.id === messageId
        ? {
            ...message,
            finishReason: null,
            error: null,
            provider: null,
            model: null,
          }
        : message
    );
    setMessages(conversation);
    await runStream({
      conversation,
      targetId: messageId,
      documents: activeDocuments,
      append: true,
      hiddenInstruction: "Continue exactly where your previous response stopped because of the output limit. Do not repeat any earlier sentences. Continue with the next unfinished content and finish naturally.",
    });
  }

  async function retryMessage(messageId) {
    if (streaming) return;

    const index =
      messages.findIndex(
        (message) =>
          message.id === messageId
      );

    if (index <= 0) return;

    const target =
      messages[index];

    const conversation =
      messages.slice(0, index);

    if (
      target?.generationMode ===
      "image"
    ) {
      const previousUser =
        [...conversation]
          .reverse()
          .find(
            (message) =>
              message.role === "user"
          );

      const prompt =
        String(
          target.imagePrompt ||
          previousUser?.content ||
          ""
        ).trim();

      if (!prompt) return;

      const replacement = {
        id: messageId,
        role: "assistant",
        content: "",
        finishReason: null,
        error: null,
        provider: null,
        model: null,
        generationMode: "image",
        imagePrompt: prompt,
      };

      setMessages([
        ...conversation,
        replacement,
      ]);

      await runImageGeneration({
        prompt,
        targetId: messageId,
      });

      return;
    }

    const replacement = {
      id: messageId,
      role: "assistant",
      content: "",
      finishReason: null,
      error: null,
      provider: null,
      model: null,
    };

    setMessages([
      ...conversation,
      replacement,
    ]);

    await runStream({
      conversation,
      targetId: messageId,
      documents: activeDocuments,
    });
  }

  function stopGeneration() {
    abortRef.current?.abort?.();
    setStreaming(false);
  }

  function copyMessage(id, content) {
    navigator.clipboard.writeText(content);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1200);
  }

  function toggleImageMode() {
    if (streaming) return;

    if (
      !imageMode &&
      attachments.length > 0
    ) {
      window.alert(
        "Remove attachments before entering Create image mode."
      );
      return;
    }

    setImageMode(
      (current) => !current
    );

    window.requestAnimationFrame(
      () =>
        textareaRef.current?.focus?.()
    );
  }

  function downloadGeneratedImage(message) {
    const dataUrl =
      message?.generatedImage?.dataUrl;

    if (
      typeof dataUrl !== "string" ||
      !dataUrl.startsWith("data:image/")
    ) {
      return;
    }

    const link =
      document.createElement("a");

    link.href = dataUrl;

    link.download =
      generatedImageFileName(
        message.imagePrompt ||
        message.generatedImage?.prompt,
        message.generatedImage?.mimeType
      );

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleKeyDown(event) {
    const sendWithEnter = settings.enterToSend && event.key === "Enter" && !event.shiftKey;
    const sendWithShortcut = !settings.enterToSend && event.key === "Enter" && (event.metaKey || event.ctrlKey);
    if (sendWithEnter || sendWithShortcut) {
      event.preventDefault();
      submitMessage();
    }
  }

  function handleConversationCopy(event) {
    const clean = cleanConversationCopy(window.getSelection()?.toString());
    if (!clean) return;
    event.preventDefault();
    event.clipboardData?.setData("text/plain", clean);
  }

  return {
    messages,
    setMessages,
    input,
    setInput,
    streaming,
    imageMode,
    copied,
    activeTitle,
    setActiveTitle,
    activeHistoryId,
    setActiveHistoryId,
    contextUsage,
    setContextUsage,
    contextPercent,
    contextState,
    requestUsage,
    hasUserMessages,
    scrollRef,
    textareaRef,
    abortRef,
    resetChat,
    openHistory,
    submitMessage,
    continueMessage,
    retryMessage,
    stopGeneration,
    copyMessage,
    toggleImageMode,
    downloadGeneratedImage,
    handleKeyDown,
    handleConversationCopy,
  };
}
