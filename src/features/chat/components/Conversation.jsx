import { AlertCircle, Check, Copy, FileText, Plus, RefreshCw, Sparkles, Volume2 } from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";
import { Logo } from "../../../components/ui/Logo.jsx";
import { MarkdownMessage } from "./MarkdownMessage.jsx";
import { STARTERS } from "../../../config/constants.js";

export function Conversation() {
  const app = useApp();
  const visibleMessages = app.messages.filter((message) => message.id !== "welcome");

  return (
    <section className="conversation" ref={app.scrollRef} onCopy={app.handleConversationCopy}>
      <div className={`conversation-inner ${!app.hasUserMessages ? "empty-state-layout" : ""}`}>
        {!app.hasUserMessages ? (
          <div className="hero">
            <div className="hero-icon"><Sparkles size={23} /></div>
            <h1>How can I help you today?</h1>
            <p>Chat, analyze images and documents, write code, or start a hands-free voice conversation.</p>
            <div className="starter-grid">
              {STARTERS.map((starter) => (
                <button key={starter} onClick={() => app.submitMessage(starter)}>
                  <Plus size={16} /><span>{starter}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-list">
            {visibleMessages.map((message, index) => {
              const isLastAssistant = message.role === "assistant" && !visibleMessages.slice(index + 1).some((next) => next.role === "assistant");
              return (
                <article className={`message ${message.role === "user" ? "user-message" : "assistant-message"}`} key={message.id}>
                  {message.role === "assistant" && <div className="assistant-avatar"><Logo size={24} /></div>}
                  <div className="message-column">
                    <div className="message-label">{message.role === "user" ? "You" : "Codarox AI"}</div>

                    {message.role === "user" && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                      <div className="message-attachments">
                        {message.attachments.map((attachment) => (
                          <div className="message-attachment" key={attachment.id || attachment.name}>
                            {attachment.kind === "image" && attachment.data
                              ? <img src={attachment.data} alt={attachment.name} />
                              : <span className="message-attachment-icon"><FileText size={15} /></span>}
                            <span>{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.error ? (
                      <div className="chat-error-card">
                        <AlertCircle size={18} />
                        <div>
                          <strong>{message.error.title}</strong>
                          <p>{message.error.message}</p>
                          {message.error.retryable && isLastAssistant && (
                            <button onClick={() => app.retryMessage(message.id)}><RefreshCw size={14} /> Retry</button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="message-content">
                        {message.role === "assistant"
                          ? message.content
                            ? <MarkdownMessage>{message.content}</MarkdownMessage>
                            : <div className="thinking"><span /><span /><span /></div>
                          : message.content}
                      </div>
                    )}

                    {message.role === "assistant" && message.content && !message.error && (
                      <div className="message-actions-row">
                        <div className="message-actions">
                          <button onClick={() => app.copyMessage(message.id, message.content)} title="Copy">
                            {app.copied === message.id ? <Check size={15} /> : <Copy size={15} />}
                          </button>
                          <button onClick={() => app.speak(message.content)} title="Read aloud"><Volume2 size={15} /></button>
                          {isLastAssistant && <button onClick={() => app.retryMessage(message.id)} title="Retry"><RefreshCw size={15} /></button>}
                        </div>
                        {isLastAssistant && (message.finishReason === "length" || message.finishReason === "MAX_TOKENS" || message.interrupted) && (
                          <button className="continue-button" onClick={() => app.continueMessage(message.id)} disabled={app.streaming}>Continue generating</button>
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
    </section>
  );
}
