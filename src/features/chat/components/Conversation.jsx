import { useState, useEffect } from "react";
import { AlertCircle, ArrowDown, Check, Copy, Download, FileText, Pencil, Plus, RefreshCw, Volume2 } from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";
import { Logo } from "../../../components/ui/Logo.jsx";
import { STARTERS } from "../../../config/constants.js";
import { MarkdownMessage } from "./MarkdownMessage.jsx";
import { RegenerateMenu } from "./RegenerateMenu.jsx";
import { UserMessageEditor } from "./UserMessageEditor.jsx";

function formatModelName(model) {
  const raw = String(model || "").trim();
  if (!raw) return "";

  const id = (raw.split("/").pop() || raw).replace(/:free$/i, "");
  const acronyms = new Map([
    ["ai", "AI"],
    ["api", "API"],
    ["gpt", "GPT"],
    ["llm", "LLM"],
    ["oss", "OSS"],
    ["vl", "VL"],
  ]);

  return id
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (acronyms.has(lower)) return acronyms.get(lower);
      if (/^\d+b$/i.test(part)) return part.toUpperCase();
      if (/^\d+(?:\.\d+)*$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function UserAttachments({ attachments }) {
  if (!Array.isArray(attachments) || !attachments.length) return null;

  return (
    <div className="message-attachments">
      {attachments.map((attachment) => (
        <div className="message-attachment" key={attachment.id || attachment.name}>
          {attachment.kind === "image" && attachment.data ? (
            <img src={attachment.data} alt={attachment.name} />
          ) : (
            <span className="message-attachment-icon"><FileText size={15} /></span>
          )}
          <span>{attachment.name}</span>
        </div>
      ))}
    </div>
  );
}

export function Conversation() {
  const app = useApp();

  /*
   * CODAROX_COMPOSER_OFFSET_OBSERVER
   *
   * Keep floating conversation controls positioned relative
   * to the actual composer height instead of a hard-coded
   * bottom offset.
   *
   * This automatically handles:
   * - multi-line composer input
   * - attachments
   * - document mode
   * - image mode
   * - compact/comfortable density
   */
  useEffect(() => {
    const conversation =
      app.scrollRef?.current;

    const main =
      conversation?.closest(".main");

    const composer =
      main?.querySelector(
        ".composer-wrap"
      );

    if (
      !main ||
      !composer
    ) {
      return undefined;
    }

    let frame = 0;

    const updateComposerHeight = () => {
      if (frame) {
        window.cancelAnimationFrame(
          frame
        );
      }

      frame =
        window.requestAnimationFrame(
          () => {
            const height =
              Math.ceil(
                composer
                  .getBoundingClientRect()
                  .height
              );

            main.style.setProperty(
              "--codarox-composer-height",
              height + "px"
            );
          }
        );
    };


    updateComposerHeight();


    const observer =
      typeof ResizeObserver !==
      "undefined"
        ? new ResizeObserver(
            updateComposerHeight
          )
        : null;


    observer?.observe(composer);

    window.addEventListener(
      "resize",
      updateComposerHeight,
      {
        passive: true,
      }
    );


    return () => {
      observer?.disconnect();

      window.removeEventListener(
        "resize",
        updateComposerHeight
      );

      if (frame) {
        window.cancelAnimationFrame(
          frame
        );
      }

      main.style.removeProperty(
        "--codarox-composer-height"
      );
    };
  }, []);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const visibleMessages = app.messages.filter((message) => message.id !== "welcome");

  return (
    <section
      className="conversation"
      ref={app.scrollRef}
      onScroll={app.handleConversationScroll}
      onCopy={app.handleConversationCopy}
    >
      <div className={`conversation-inner ${!app.hasUserMessages ? "empty-state-layout" : ""}`}>
        {!app.hasUserMessages ? (
          <div className="hero">
            <div className="hero-icon"><Logo size={28} /></div>
            <h1>How can I help you today?</h1>
            <p>Chat, analyze images and documents, write code, and explore ideas.</p>
            <div className="starter-grid">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => app.submitMessage(starter)}
                  aria-label={`Start prompt: ${starter}`}
                >
                  <span className="starter-icon" aria-hidden="true"><Plus size={15} /></span>
                  <span className="starter-label">{starter}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {visibleMessages.map((message, index) => {
              const isLastAssistant = message.role === "assistant" && !visibleMessages
                .slice(index + 1)
                .some((next) => next.role === "assistant");

              const editing = message.role === "user" && editingMessageId === message.id;
              const editCapability = message.role === "user"
                ? app.getEditCapability(message.id)
                : null;

              return (
                <article
                  className={`message ${message.role === "user" ? "user-message" : "assistant-message"}`}
                  key={message.id}
                >
                  {message.role === "assistant" && (
                    <div className="assistant-avatar"><Logo size={24} /></div>
                  )}

                  <div className="message-column">
                    <div className="message-meta">
                      <div className="message-label">{message.role === "user" ? "You" : "Codarox AI"}</div>

                      {message.role === "assistant" && app.settings.showModelMetadata !== false && message.model && (
                        <span
                          className="message-model"
                          title={message.provider ? `${message.provider} · ${message.model}` : message.model}
                          aria-label={`Model: ${message.model}`}
                        >
                          {formatModelName(message.model)}
                        </span>
                      )}
                    </div>

                    {message.role === "user" && <UserAttachments attachments={message.attachments} />}

                    {message.error ? (
                      <div className="chat-error-card">
                        <AlertCircle size={18} />
                        <div>
                          <strong>{message.error.title}</strong>
                          <p>{message.error.message}</p>
                          {message.error.retryable && isLastAssistant && (
                            <button onClick={() => app.retryMessage(message.id)}>
                              <RefreshCw size={14} /> Retry
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="message-content">
                        {message.role === "assistant" ? (
                          <>
                            {isLastAssistant && app.streaming && (
                              <div
                                className={`stream-status ${message.content ? "generating" : "thinking-state"}`}
                                role="status"
                                aria-live="polite"
                              >
                                <span className="stream-status-indicator" aria-hidden="true" />
                                <span className="stream-status-label">
                                  {message.generationMode === "image-edit"
                                    ? "Editing image"
                                    : message.generationMode === "image"
                                      ? "Generating image"
                                      : message.content
                                        ? "Generating"
                                        : "Thinking"}
                                </span>
                                {!message.content && (
                                  <span className="stream-status-dots" aria-hidden="true">
                                    <span /><span /><span />
                                  </span>
                                )}
                              </div>
                            )}

                            {message.generatedImage?.dataUrl ? (
                              <figure className="generated-image-card">
                                <img
                                  src={message.generatedImage.dataUrl}
                                  alt={message.imagePrompt || message.generatedImage.prompt || "Generated image"}
                                />
                                <figcaption>{message.imagePrompt || message.generatedImage.prompt}</figcaption>
                              </figure>
                            ) : message.content ? (
                              <MarkdownMessage>{message.content}</MarkdownMessage>
                            ) : null}
                          </>
                        ) : editing ? (
                          <UserMessageEditor
                            message={message}
                            onCancel={() => setEditingMessageId(null)}
                            onSave={(text) => app.editAndResendMessage(message.id, text)}
                          />
                        ) : (
                          message.content
                        )}
                      </div>
                    )}

                    {message.role === "user" && !editing && (
                      <div className="user-message-actions" role="group" aria-label="User message actions">
                        <button
                          type="button"
                          onClick={() => {
                            if (editCapability?.available) setEditingMessageId(message.id);
                          }}
                          aria-label="Edit and resend message"
                          data-tooltip={editCapability?.available ? "Edit & resend" : editCapability?.reason}
                          disabled={app.streaming || !editCapability?.available}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}

                    {message.role === "assistant" && message.content && !message.error && (
                      <div className="message-actions-row">
                        <div className="message-actions" role="group" aria-label="Message actions">
                          {message.generatedImage?.dataUrl ? (
                            <>
                              <button
                                type="button"
                                onClick={() => app.editGeneratedImage(message)}
                                aria-label="Edit generated image"
                                data-tooltip="Edit"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => app.downloadGeneratedImage(message)}
                                aria-label="Download generated image"
                                data-tooltip="Download"
                              >
                                <Download size={15} />
                              </button>

                              {isLastAssistant && (
                                <button
                                  type="button"
                                  onClick={() => app.retryMessage(message.id)}
                                  aria-label={message.generationMode === "image-edit" ? "Retry image edit" : "Regenerate image"}
                                  data-tooltip={message.generationMode === "image-edit" ? "Retry edit" : "Regenerate"}
                                  disabled={app.streaming}
                                >
                                  <RefreshCw size={15} />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => app.copyMessage(message.id, message.content)}
                                aria-label={app.copied === message.id ? "Copied" : "Copy response"}
                                data-tooltip={app.copied === message.id ? "Copied" : "Copy"}
                                data-copied={app.copied === message.id ? "true" : undefined}
                              >
                                {app.copied === message.id ? <Check size={15} /> : <Copy size={15} />}
                              </button>

                              <button
                                type="button"
                                onClick={() => app.speak(message.content)}
                                aria-label="Read response aloud"
                                data-tooltip="Read aloud"
                              >
                                <Volume2 size={15} />
                              </button>

                              {isLastAssistant && <RegenerateMenu app={app} message={message} />}
                            </>
                          )}
                        </div>

                        {isLastAssistant && (
                          message.finishReason === "length" ||
                          message.finishReason === "MAX_TOKENS" ||
                          message.interrupted
                        ) && (
                          <button
                            type="button"
                            className="continue-button"
                            onClick={() => app.continueMessage(message.id)}
                            disabled={app.streaming}
                          >
                            Continue generating
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {app.showScrollToLatest && (
        <button
          type="button"
          className="scroll-to-latest"
          onClick={() => app.scrollToLatest("smooth")}
          aria-label="Scroll to latest message"
          title="Scroll to latest message"
        >
          <ArrowDown size={17} />
        </button>
      )}
    </section>
  );
}
