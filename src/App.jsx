import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  AudioLines,
  Check,
  Copy,
  Headphones,
  MessageSquarePlus,
  Mic,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Logo } from "./components/Logo.jsx";
import { MarkdownMessage } from "./components/MarkdownMessage.jsx";

const INITIAL_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I’m Codarox AI. Ask me anything, or start **Voice Mode** to talk naturally.",
};

const STARTERS = [
  "Explain a complex topic simply",
  "Help me write production React code",
  "Brainstorm a new product idea",
  "Review an architecture decision",
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function supportsSpeechRecognition() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function getSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
}

function shortTitle(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New conversation";
  return clean.length > 36 ? `${clean.slice(0, 36)}…` : clean;
}

const HISTORY_KEY = "codarox-ai-history-v1";
const DEFAULT_CONTEXT_LIMIT = 262144;
const CONTEXT_WARNING_AT = 0.8;
const CONTEXT_DANGER_AT = 0.9;
const CONTEXT_HARD_STOP_AT = 0.95;

function emptyContextUsage() {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    contextLimit: DEFAULT_CONTEXT_LIMIT,
    model: null,
  };
}

function formatTokens(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") !== "light");
  const [copied, setCopied] = useState(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [history, setHistory] = useState(loadHistory);
  const [activeTitle, setActiveTitle] = useState("New conversation");
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [contextUsage, setContextUsage] = useState(emptyContextUsage);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortRef = useRef(null);
  const voiceModeRef = useRef(false);

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
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    setSpeechSupported(supportsSpeechRecognition());
  }, []);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

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
      messages,
      contextUsage,
      updatedAt: Date.now(),
    };

    setHistory((items) => [
      entry,
      ...items.filter((item) => item.id !== id),
    ].slice(0, 20));
  }, [streaming, hasUserMessages, messages, activeTitle, activeHistoryId, contextUsage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel?.();
      abortRef.current?.abort?.();
    };
  }, []);

  function resetChat() {
    abortRef.current?.abort?.();
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setActiveTitle("New conversation");
    setActiveHistoryId(null);
    setContextUsage(emptyContextUsage());
    setStreaming(false);
  }

  function openHistory(item) {
    abortRef.current?.abort?.();
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();

    const restoredMessages = Array.isArray(item.messages) && item.messages.length
      ? item.messages
      : [INITIAL_MESSAGE, { id: createId(), role: "user", content: item.preview || item.title }];

    setMessages(restoredMessages);
    setInput("");
    setActiveTitle(item.title || "Conversation");
    setActiveHistoryId(item.id);
    setContextUsage(item.contextUsage || emptyContextUsage());
    setStreaming(false);
  }

  function deleteHistoryItem(id, event) {
    event?.stopPropagation?.();
    setHistory((items) => items.filter((item) => item.id !== id));

    if (activeHistoryId === id) {
      abortRef.current?.abort?.();
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel?.();
      setMessages([INITIAL_MESSAGE]);
      setInput("");
      setActiveTitle("New conversation");
      setActiveHistoryId(null);
      setContextUsage(emptyContextUsage());
      setStreaming(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    if (activeHistoryId) {
      abortRef.current?.abort?.();
      recognitionRef.current?.abort?.();
      window.speechSynthesis?.cancel?.();
      setMessages([INITIAL_MESSAGE]);
      setInput("");
      setActiveTitle("New conversation");
      setActiveHistoryId(null);
      setContextUsage(emptyContextUsage());
      setStreaming(false);
    }
  }

  async function submitMessage(rawText = input) {
    const text = rawText.trim();
    if (!text || streaming) return;

    if (contextPercent >= CONTEXT_HARD_STOP_AT * 100) {
      const warningText = `**This conversation has reached its safe context limit.**\n\nYou have used about **${formatTokens(contextUsage.totalTokens)} / ${formatTokens(contextUsage.contextLimit)} tokens**. Start a **New chat** to continue with a fresh context window. Your current draft has been kept in the input box.`;
      setMessages((current) => {
        const last = current[current.length - 1];
        if (last?.role === "assistant" && last?.content === warningText) return current;
        return [...current, { id: createId(), role: "assistant", content: warningText, localNotice: true }];
      });
      return;
    }

    const userMessage = { id: createId(), role: "user", content: text };
    const assistantMessage = { id: createId(), role: "assistant", content: "" };
    const outgoing = [...messages, userMessage];

    if (!hasUserMessages) setActiveTitle(shortTitle(text));

    setInput("");
    setMessages([...outgoing, assistantMessage]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: outgoing
            .filter((m) => m.id !== "welcome")
            .map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      if (!response.body) throw new Error("Streaming is not available in this browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let streamError = null;

      const consumeLine = (line) => {
        if (!line.trim()) return;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }

        if (event.type === "delta" && typeof event.text === "string") {
          fullText += event.text;
          setMessages((current) =>
            current.map((m) => (m.id === assistantMessage.id ? { ...m, content: fullText } : m))
          );
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
      if (buffer.trim()) consumeLine(buffer);

      if (streamError && !fullText.trim()) throw new Error(streamError);
      if (streamError && fullText.trim()) {
        fullText += `\n\n_The provider interrupted this response: ${streamError}_`;
        setMessages((current) =>
          current.map((m) => (m.id === assistantMessage.id ? { ...m, content: fullText } : m))
        );
      }

      if (voiceModeRef.current && voiceEnabled && fullText.trim()) {
        speak(fullText);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        const content = `**Connection error**\n\n${error.message}`;
        setMessages((current) =>
          current.map((m) => (m.id === assistantMessage.id ? { ...m, content } : m))
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
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

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const clean = text
      .replace(/```[\s\S]*?```/g, " code block ")
      .replace(/[#*_`>\[\]()~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-US";
    utterance.rate = 1.02;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoiceListening() {
    if (!speechSupported || streaming) return;

    if (listening) {
      recognitionRef.current?.stop?.();
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = "";

    recognition.onstart = () => {
      finalText = "";
      setListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      setInput(`${finalText}${interim}`);
    };

    recognition.onerror = () => setListening(false);

    recognition.onend = () => {
      setListening(false);
      const text = finalText.trim();
      if (voiceModeRef.current && text) submitMessage(text);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function openVoiceMode() {
    setVoiceMode(true);
    window.setTimeout(() => {
      if (speechSupported && !listening && !streaming) toggleVoiceListening();
    }, 180);
  }

  function closeVoiceMode() {
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();
    setListening(false);
    setVoiceMode(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-top">
          <div className="brand">
            <Logo size={28} />
            <span>Codarox AI</span>
          </div>
          <button
            className="icon-button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <button className="new-chat" onClick={resetChat}>
          <MessageSquarePlus size={17} />
          <span>New chat</span>
          <kbd>⌘ K</kbd>
        </button>

        <div className="side-section">
          <div className="side-label-row">
            <div className="side-label">Recent</div>
            {history.length > 0 && (
              <button className="clear-history" onClick={clearHistory} title="Clear history">
                Clear
              </button>
            )}
          </div>

          <div className="history-row active">
            <button className="history-main" onClick={() => {}}>
              <span>{activeTitle}</span>
            </button>
            {activeHistoryId && (
              <button
                className="history-delete"
                onClick={(event) => deleteHistoryItem(activeHistoryId, event)}
                title="Delete conversation"
                aria-label="Delete current conversation"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {history
            .filter((item) => item.id !== activeHistoryId)
            .map((item) => (
              <div key={item.id} className="history-row" title={item.preview}>
                <button className="history-main" onClick={() => openHistory(item)}>
                  <span>{item.title}</span>
                </button>
                <button
                  className="history-delete"
                  onClick={(event) => deleteHistoryItem(item.id, event)}
                  title="Delete conversation"
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>

        <div className="sidebar-bottom">
          <div className={`context-meter ${contextState}`}>
            <div className="context-meter-heading">
              <span>Active context</span>
              <span>{Math.round(contextPercent)}%</span>
            </div>
            <div className="context-progress" aria-label={`${Math.round(contextPercent)}% context used`}>
              <span style={{ width: `${contextPercent}%` }} />
            </div>
            <div className="context-meter-meta">
              <span>{formatTokens(contextUsage.totalTokens)} / {formatTokens(contextUsage.contextLimit)}</span>
              <span>tokens</span>
            </div>
            {contextState !== "normal" && (
              <div className="context-meter-note">
                {contextState === "full"
                  ? "Context is full — start a New chat."
                  : contextState === "danger"
                    ? "Almost full — start a new chat soon."
                    : "Long conversation — context is filling up."}
              </div>
            )}
          </div>

          <button className="sidebar-action">
            <Settings2 size={17} />
            <span>Settings</span>
          </button>
          <div className="profile">
            <div className="avatar">A</div>
            <div className="profile-copy">
              <strong>Armin</strong>
              <span>Free workspace</span>
            </div>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <button className="icon-button" onClick={() => setSidebarOpen(true)}>
                <PanelLeftOpen size={19} />
              </button>
            )}
          </div>

          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setDark((value) => !value)}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="voice-top-button" onClick={openVoiceMode}>
              <Headphones size={17} />
              Voice
            </button>
          </div>
        </header>

        <section className="conversation" ref={scrollRef}>
          <div className={`conversation-inner ${!hasUserMessages ? "empty-state-layout" : ""}`}>
            {!hasUserMessages ? (
              <div className="hero">
                <div className="hero-icon">
                  <Sparkles size={23} />
                </div>
                <h1>How can I help you today?</h1>
                <p>
                  Chat with a hosted open model, write code, explore ideas, or start a
                  hands-free voice conversation.
                </p>

                <div className="starter-grid">
                  {STARTERS.map((starter) => (
                    <button key={starter} onClick={() => submitMessage(starter)}>
                      <Plus size={16} />
                      <span>{starter}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="message-list">
                {messages
                  .filter((message) => message.id !== "welcome")
                  .map((message) => (
                    <article
                      className={`message ${message.role === "user" ? "user-message" : "assistant-message"}`}
                      key={message.id}
                    >
                      {message.role === "assistant" && (
                        <div className="assistant-avatar">
                          <Logo size={24} />
                        </div>
                      )}

                      <div className="message-column">
                        <div className="message-label">
                          {message.role === "user" ? "You" : "Codarox AI"}
                        </div>

                        <div className="message-content">
                          {message.role === "assistant" ? (
                            message.content ? (
                              <MarkdownMessage>{message.content}</MarkdownMessage>
                            ) : (
                              <div className="thinking">
                                <span />
                                <span />
                                <span />
                              </div>
                            )
                          ) : (
                            message.content
                          )}
                        </div>

                        {message.role === "assistant" && message.content && (
                          <div className="message-actions">
                            <button onClick={() => copyMessage(message.id, message.content)}>
                              {copied === message.id ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                            <button onClick={() => speak(message.content)}>
                              <Volume2 size={15} />
                            </button>
                            <button onClick={() => submitMessage("Please try that answer again.")}>
                              <RotateCcw size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </div>
        </section>

        <section className="composer-wrap">
          {contextState !== "normal" && (
            <div className={`context-inline-warning ${contextState}`}>
              <span>Context {Math.round(contextPercent)}% used</span>
              <span>{contextState === "full" ? "Open a New chat to continue." : "This conversation is getting long."}</span>
            </div>
          )}
          <div className={`composer ${listening ? "listening" : ""}`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? "Listening…" : "Message Codarox AI"}
              rows={1}
              aria-label="Message Codarox AI"
            />

            <div className="composer-bottom">
              <div className="composer-tools">
                <button className="tool-button" aria-label="Add">
                  <Plus size={18} />
                </button>
                <button
                  className={`tool-button ${listening ? "active" : ""}`}
                  onClick={toggleVoiceListening}
                  disabled={!speechSupported || streaming}
                  aria-label="Voice input"
                  title={speechSupported ? "Voice input" : "Speech recognition is not supported here"}
                >
                  {listening ? <AudioLines size={18} /> : <Mic size={18} />}
                </button>
                <span className="free-model-note">Free hosted model</span>
              </div>

              {streaming ? (
                <button className="send-button stop-button" onClick={stopGeneration} aria-label="Stop">
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  className="send-button"
                  disabled={!input.trim()}
                  onClick={() => submitMessage()}
                  aria-label="Send"
                >
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="composer-hint">
            AI can make mistakes. Verify important information.
          </div>
        </section>
      </main>

      {voiceMode && (
        <div className="voice-overlay">
          <div className="voice-panel">
            <div className="voice-header">
              <div className="brand">
                <Logo size={26} />
                <span>Voice Mode</span>
              </div>
              <div className="voice-header-actions">
                <button
                  className="icon-button glass"
                  onClick={() => {
                    setVoiceEnabled((value) => !value);
                    window.speechSynthesis?.cancel?.();
                  }}
                  title="Toggle spoken responses"
                >
                  {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button className="icon-button glass" onClick={closeVoiceMode}>
                  <X size={19} />
                </button>
              </div>
            </div>

            <div className="voice-center">
              <div className={`voice-orb ${listening ? "is-listening" : ""} ${streaming ? "is-thinking" : ""}`}>
                <div className="orb-core">
                  <AudioLines size={34} />
                </div>
                <span className="orb-ring ring-one" />
                <span className="orb-ring ring-two" />
              </div>

              <div className="voice-status">
                <h2>
                  {streaming
                    ? "Thinking…"
                    : listening
                      ? "I’m listening"
                      : "Ready when you are"}
                </h2>
                <p>
                  {input ||
                    (speechSupported
                      ? "Speak naturally in English."
                      : "Speech recognition is not supported by this browser.")}
                </p>
              </div>
            </div>

            <div className="voice-controls">
              <button
                className={`voice-mic ${listening ? "active" : ""}`}
                onClick={toggleVoiceListening}
                disabled={!speechSupported || streaming}
              >
                {listening ? <Square size={19} fill="currentColor" /> : <Mic size={21} />}
              </button>
              <span>{listening ? "Tap to stop" : "Tap to speak"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
