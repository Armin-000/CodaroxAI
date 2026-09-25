import { useEffect, useState } from "react";
import { Check, Cpu, MessageSquare, Mic, Palette, Settings, SlidersHorizontal, UserCircle, X, ShieldCheck } from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";
import { MODEL_OPTIONS, getModelOption } from "../../models/modelCatalog.js";

const VIEW_META = {
  general: ["General", "Manage language and interaction preferences."],
  design: ["Design", "Customize appearance and readability."],
  models: ["Models", "Choose how Codarox routes AI responses."],
  responses: ["Responses", "Control how Codarox writes and responds."],
  voice: ["Voice", "Configure speech input, spoken responses, and hands-free conversations."],
  account: ["Data & Privacy", "Manage local data, privacy, and browser storage."],
  advanced: ["Advanced", "Adjust deeper behavior and model controls."],
};

const NAV_ITEMS = [
  ["general", "General", "Language and input", SlidersHorizontal],
  ["design", "Design", "Theme and typography", Palette],
  ["models", "Models", "AI model selection", Cpu],
  ["responses", "Responses", "Length and style", MessageSquare],
  ["voice", "Voice", "Speech settings", Mic],
  ["account", "Data & Privacy", "Local data and privacy", ShieldCheck],
  ["advanced", "Advanced", "Technical controls", Settings],
];

export function SettingsModal() {
  const app = useApp();
  if (!app.settingsOpen) return null;

  const [title, description] = VIEW_META[app.settingsView] || VIEW_META.general;

  return (
    <div
      className="settings-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) app.setSettingsOpen(false);
      }}
    >
      <div className="settings-modal settings-sidebar-shell" role="dialog" aria-modal="true" aria-label="Settings">
        <aside className="settings-sidebar-panel">
          <div className="settings-sidebar-top">
            <div className="settings-sidebar-title">
              <h2>Settings</h2>
              <p>Customize your Codarox AI experience.</p>
            </div>
          </div>

          <nav className="settings-sidebar-nav">
            {NAV_ITEMS.map(([id, label, detail, Icon]) => (
              <button
                type="button"
                key={id}
                className={`settings-nav-item ${app.settingsView === id ? "active" : ""}`}
                onClick={() => app.setSettingsView(id)}
              >
                <span className="settings-nav-icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <span className="settings-nav-copy"><strong>{label}</strong><small>{detail}</small></span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="settings-content-panel">
          <div className="settings-content-header">
            <div><h3>{title}</h3><p>{description}</p></div>
            <button className="icon-button" type="button" aria-label="Close settings" onClick={() => app.setSettingsOpen(false)}><X size={19} /></button>
          </div>

          <div className="settings-content-body">
            {app.settingsView === "general" && <GeneralPanel app={app} />}
            {app.settingsView === "design" && <DesignPanel app={app} />}
            {app.settingsView === "models" && <ModelsPanel app={app} />}
            {app.settingsView === "responses" && <ResponsesPanel app={app} />}
            {app.settingsView === "voice" && <VoicePanel app={app} />}
            {app.settingsView === "account" && <AccountPanel app={app} />}
            {app.settingsView === "advanced" && <AdvancedPanel app={app} />}
          </div>

          <div className="settings-content-footer">
            <div className="settings-save-state"><Check size={14} /><span>Saved automatically</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function GeneralPanel({ app }) {
  return (
    <div className="settings-panel-section">

      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>Language</strong>

          <small>
            Language used for AI responses.
          </small>
        </span>

        <select
          value={app.settings.language}
          onChange={(event) =>
            app.updateSetting(
              "language",
              event.target.value
            )
          }
        >
          <option value="auto">
            Auto
          </option>

          <option value="hr">
            Croatian
          </option>

          <option value="en">
            English
          </option>
        </select>
      </label>


      <label className="settings-split-row settings-toggle-row">
        <span className="settings-row-copy">
          <strong>
            Enter to send
          </strong>

          <small>
            Otherwise use Cmd/Ctrl + Enter.
          </small>
        </span>

        <input
          type="checkbox"
          checked={Boolean(
            app.settings.enterToSend
          )}
          onChange={(event) =>
            app.updateSetting(
              "enterToSend",
              event.target.checked
            )
          }
        />
      </label>


      <label className="settings-split-row settings-toggle-row">
        <span className="settings-row-copy">
          <strong>
            Restore last conversation
          </strong>

          <small>
            Reopen your most recently active chat when Codarox starts.
          </small>
        </span>

        <input
          type="checkbox"
          checked={
            app.settings.restoreLastConversation !==
            false
          }
          onChange={(event) =>
            app.updateSetting(
              "restoreLastConversation",
              event.target.checked
            )
          }
        />
      </label>


      <label className="settings-split-row settings-toggle-row">
        <span className="settings-row-copy">
          <strong>
            Focus composer automatically
          </strong>

          <small>
            Place the cursor in the message box when a chat is ready.
          </small>
        </span>

        <input
          type="checkbox"
          checked={
            app.settings.focusComposerAutomatically !==
            false
          }
          onChange={(event) =>
            app.updateSetting(
              "focusComposerAutomatically",
              event.target.checked
            )
          }
        />
      </label>


      <label className="settings-split-row settings-toggle-row">
        <span className="settings-row-copy">
          <strong>
            Confirm before deleting chats
          </strong>

          <small>
            Ask before permanently removing conversations or clearing history.
          </small>
        </span>

        <input
          type="checkbox"
          checked={
            app.settings.confirmBeforeDelete !==
            false
          }
          onChange={(event) =>
            app.updateSetting(
              "confirmBeforeDelete",
              event.target.checked
            )
          }
        />
      </label>

    </div>
  );
}

function DesignPanel({ app }) {
  const codeSizeLabels = {
    small: "Small",
    normal: "Normal",
    large: "Large",
  };

  return (
    <div className="settings-panel-section settings-design-panel">

      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>Theme</strong>
          <small>
            Match your system or choose an appearance.
          </small>
        </span>

        <select
          value={app.settings.theme}
          onChange={(event) =>
            app.updateSetting(
              "theme",
              event.target.value
            )
          }
        >
          <option value="system">
            System
          </option>

          <option value="light">
            Light
          </option>

          <option value="dark">
            Dark
          </option>
        </select>
      </label>


      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>
            Chat font size
          </strong>

          <small>
            Size of messages and composer text.
          </small>
        </span>

        <select
          value={app.settings.fontSize}
          onChange={(event) =>
            app.updateSetting(
              "fontSize",
              Number(event.target.value)
            )
          }
        >
          {[14, 15, 16, 17, 18].map(
            (size) => (
              <option
                key={size}
                value={size}
              >
                {size}px
              </option>
            )
          )}
        </select>
      </label>


      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>
            Message width
          </strong>

          <small>
            Control the maximum width of conversations and the composer.
          </small>
        </span>

        <select
          value={
            app.settings.messageWidth ||
            "comfortable"
          }
          onChange={(event) =>
            app.updateSetting(
              "messageWidth",
              event.target.value
            )
          }
        >
          <option value="compact">
            Compact
          </option>

          <option value="comfortable">
            Comfortable
          </option>

          <option value="wide">
            Wide
          </option>
        </select>
      </label>


      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>
            Interface density
          </strong>

          <small>
            Adjust spacing without changing the overall Codarox layout.
          </small>
        </span>

        <select
          value={
            app.settings.interfaceDensity ||
            "comfortable"
          }
          onChange={(event) =>
            app.updateSetting(
              "interfaceDensity",
              event.target.value
            )
          }
        >
          <option value="comfortable">
            Comfortable
          </option>

          <option value="compact">
            Compact
          </option>
        </select>
      </label>


      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>
            Code font size
          </strong>

          <small>
            Change text size inside code blocks only.
          </small>
        </span>

        <select
          value={
            app.settings.codeFontSize ||
            "normal"
          }
          onChange={(event) =>
            app.updateSetting(
              "codeFontSize",
              event.target.value
            )
          }
        >
          <option value="small">
            Small
          </option>

          <option value="normal">
            Normal
          </option>

          <option value="large">
            Large
          </option>
        </select>
      </label>


      <div className="settings-design-preview">
        <span className="settings-preview-label">
          Live preview
        </span>

        <div className="design-preview-stage">

          <div className="design-preview-user">
            <span>You</span>

            <p>
              Can you show me an example?
            </p>
          </div>

          <div className="design-preview-assistant">
            <span>Codarox AI</span>

            <p>
              This preview reflects your current font size,
              message width and interface density.
            </p>

            <pre>
              <code>
                {'const codarox = {\n  theme: "current",\n  density: "current"\n};'}
              </code>
            </pre>
          </div>

          <div className="design-preview-meta">
            <span>
              {app.settings.fontSize}px chat
            </span>

            <span>
              {app.settings.messageWidth ||
                "comfortable"} width
            </span>

            <span>
              {
                codeSizeLabels[
                  app.settings.codeFontSize ||
                    "normal"
                ]
              } code
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}

function ModelsPanel({ app }) {
  return (
    <div className="settings-models-page">
      <div className="settings-models-intro">
        <div><h4>Choose a model</h4><p>Select the model Codarox should use for new responses. You can also change it directly from the chat composer.</p></div>
        <span className="settings-models-current">{getModelOption(app.settings.model || "auto").shortLabel}</span>
      </div>

      <div className="settings-model-selection-grid">
        {MODEL_OPTIONS.map((model) => {
          const active = (app.settings.model || "auto") === model.value;
          return (
            <button type="button" key={model.value} className={`settings-inline-model-card ${active ? "active" : ""}`} onClick={() => app.updateSetting("model", model.value)}>
              <div className="settings-inline-model-head">
                <div><strong>{model.label}</strong><span>{model.provider} · {model.contextLabel}</span></div>
                {active && <Check size={15} aria-label="Selected" />}
              </div>
              <p>{model.description}</p>
              <div className="settings-inline-model-tags"><span>{model.bestFor}</span><span>{model.inputs}</span></div>
            </button>
          );
        })}
      </div>

      <div className="settings-model-comparison">
        <div className="settings-model-comparison-title"><h4>Compare models</h4><p>Capabilities and recommended use cases.</p></div>
        <div className="settings-model-table-scroll">
          <table className="settings-model-table">
            <thead><tr><th>Model</th><th>Provider</th><th>Context</th><th>Inputs</th><th>Best for</th></tr></thead>
            <tbody>
              {MODEL_OPTIONS.filter((model) => model.value !== "auto").map((model) => (
                <tr key={model.value} className={app.settings.model === model.value ? "active" : ""}>
                  <td data-label="Model"><strong>{model.shortLabel}</strong></td><td data-label="Provider">{model.provider}</td><td data-label="Context">{model.contextLabel}</td><td data-label="Inputs">{model.inputs}</td><td data-label="Best for">{model.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResponsesPanel({ app }) {
  const length =
    app.settings.maxTokens <= 2048
      ? 2048
      : app.settings.maxTokens <= 8192
        ? 8192
        : 16384;

  return (
    <div className="settings-panel-section">

      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>Response length</strong>
          <small>
            Choose how much detail Codarox should provide.
          </small>
        </span>

        <select
          value={length}
          onChange={(event) =>
            app.updateSetting(
              "maxTokens",
              Number(event.target.value)
            )
          }
        >
          <option value={2048}>
            Concise
          </option>

          <option value={8192}>
            Balanced
          </option>

          <option value={16384}>
            Detailed
          </option>
        </select>
      </label>


      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>Tone</strong>
          <small>
            Choose the overall writing style for responses.
          </small>
        </span>

        <select
          value={
            app.settings.responseTone ||
            "auto"
          }
          onChange={(event) =>
            app.updateSetting(
              "responseTone",
              event.target.value
            )
          }
        >
          <option value="auto">
            Auto
          </option>

          <option value="professional">
            Professional
          </option>

          <option value="friendly">
            Friendly
          </option>

          <option value="direct">
            Direct
          </option>
        </select>
      </label>


      <label className="settings-split-row">
        <span className="settings-row-copy">
          <strong>
            Preferred terminal
          </strong>

          <small>
            Used when Codarox generates shell commands.
          </small>
        </span>

        <select
          value={
            app.settings.preferredTerminal ||
            "auto"
          }
          onChange={(event) =>
            app.updateSetting(
              "preferredTerminal",
              event.target.value
            )
          }
        >
          <option value="auto">
            Auto
          </option>

          <option value="powershell">
            Windows PowerShell
          </option>

          <option value="macos">
            macOS Terminal
          </option>

          <option value="bash">
            Linux / Bash
          </option>
        </select>
      </label>


      <label className="settings-split-row settings-toggle-row">
        <span className="settings-row-copy">
          <strong>
            Prefer complete code
          </strong>

          <small>
            Prefer complete, copy-ready code over isolated fragments when practical.
          </small>
        </span>

        <input
          type="checkbox"
          checked={
            app.settings.preferCompleteCode !==
            false
          }
          onChange={(event) =>
            app.updateSetting(
              "preferCompleteCode",
              event.target.checked
            )
          }
        />
      </label>


      <label className="settings-textarea-row">
        <span className="settings-row-copy">
          <strong>
            Custom instructions
          </strong>

          <small>
            Add preferences Codarox should consistently follow.
          </small>
        </span>

        <textarea
          value={
            app.settings.systemInstructions
          }
          maxLength={3000}
          onChange={(event) =>
            app.updateSetting(
              "systemInstructions",
              event.target.value
            )
          }
          placeholder="Example: Keep responses concise and use Croatian technical terminology."
        />
      </label>


      <label className="settings-split-row settings-toggle-row">
        <span className="settings-row-copy">
          <strong>
            Generate chat titles
          </strong>

          <small>
            Automatically create descriptive titles for new conversations.
          </small>
        </span>

        <input
          type="checkbox"
          checked={
            app.settings.aiTitles
          }
          onChange={(event) =>
            app.updateSetting(
              "aiTitles",
              event.target.checked
            )
          }
        />
      </label>

    </div>
  );
}

function VoicePanel({ app }) {
  useEffect(() => () => {
    app.stopMicrophoneTest?.();
  }, []);

  const voiceOptions =
    Array.isArray(app.speechVoices)
      ? app.speechVoices
      : [];

  const handsFreeAvailable =
    app.settings.autoSpeak &&
    app.settings.voiceAutoSend !== false;

  function resetVoiceSettings() {
    app.stopMicrophoneTest?.();

    app.updateSetting(
      "voiceLanguage",
      "auto"
    );

    app.updateSetting(
      "voiceName",
      "auto"
    );

    app.updateSetting(
      "voiceRate",
      1
    );

    app.updateSetting(
      "autoSpeak",
      true
    );

    app.updateSetting(
      "voiceAutoSend",
      true
    );

    app.updateSetting(
      "voiceHandsFree",
      false
    );

    app.updateSetting(
      "voiceStopPlaybackOnListen",
      true
    );

    app.updateSetting(
      "voiceShowTranscript",
      true
    );

    app.updateSetting(
      "voiceReadCode",
      false
    );

    app.updateSetting(
      "voiceSkipUrls",
      true
    );
  }

  return (
    <div className="settings-voice-page">

      <section className="settings-voice-section">
        <div className="settings-voice-heading">
          <span>Speech input</span>
          <small>
            Control recognition, transcripts and automatic sending.
          </small>
        </div>

        <label className="settings-split-row">
          <span className="settings-row-copy">
            <strong>
              Voice language
            </strong>

            <small>
              Language used by browser speech recognition.
            </small>
          </span>

          <select
            value={app.settings.voiceLanguage}
            onChange={(event) =>
              app.updateSetting(
                "voiceLanguage",
                event.target.value
              )
            }
          >
            <option value="auto">
              Auto
            </option>

            <option value="hr-HR">
              Croatian
            </option>

            <option value="en-US">
              English (US)
            </option>

            <option value="en-GB">
              English (UK)
            </option>

            <option value="de-DE">
              German
            </option>

            <option value="it-IT">
              Italian
            </option>
          </select>
        </label>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>
              Live transcript
            </strong>

            <small>
              Show recognized words in Voice Mode while you are speaking.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              app.settings.voiceShowTranscript !==
              false
            }
            onChange={(event) =>
              app.updateSetting(
                "voiceShowTranscript",
                event.target.checked
              )
            }
          />
        </label>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>
              Send after speech ends
            </strong>

            <small>
              Automatically send the final transcript when Voice Mode detects the end of speech.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              app.settings.voiceAutoSend !==
              false
            }
            onChange={(event) => {
              app.updateSetting(
                "voiceAutoSend",
                event.target.checked
              );

              if (
                !event.target.checked
              ) {
                app.updateSetting(
                  "voiceHandsFree",
                  false
                );
              }
            }}
          />
        </label>
      </section>


      <section className="settings-voice-section">
        <div className="settings-voice-heading">
          <span>
            Spoken responses
          </span>

          <small>
            Choose how Codarox AI sounds and what gets read aloud.
          </small>
        </div>

        <label className="settings-split-row">
          <span className="settings-row-copy">
            <strong>
              Voice
            </strong>

            <small>
              {voiceOptions.length
                ? voiceOptions.length +
                  " system voices available."
                : "Uses the default system speech voice."}
            </small>
          </span>

          <select
            value={
              app.settings.voiceName ||
              "auto"
            }
            onChange={(event) =>
              app.updateSetting(
                "voiceName",
                event.target.value
              )
            }
            disabled={
              !app.speechSynthesisSupported
            }
          >
            <option value="auto">
              System default
            </option>

            {voiceOptions.map(
              (voice) => (
                <option
                  key={
                    voice.voiceURI ||
                    voice.name
                  }
                  value={
                    voice.voiceURI ||
                    voice.name
                  }
                >
                  {voice.name} · {voice.lang}
                </option>
              )
            )}
          </select>
        </label>

        <label className="settings-split-row">
          <span className="settings-row-copy">
            <strong>
              Speech speed
            </strong>

            <small>
              Text-to-speech playback rate.
            </small>
          </span>

          <select
            value={
              app.settings.voiceRate
            }
            onChange={(event) =>
              app.updateSetting(
                "voiceRate",
                Number(
                  event.target.value
                )
              )
            }
          >
            <option value={0.75}>
              0.75× · Slower
            </option>

            <option value={0.85}>
              0.85×
            </option>

            <option value={1}>
              1.0× · Normal
            </option>

            <option value={1.15}>
              1.15×
            </option>

            <option value={1.3}>
              1.3× · Faster
            </option>
          </select>
        </label>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>
              Speak responses automatically
            </strong>

            <small>
              Read completed AI responses aloud while Voice Mode is open.
            </small>
          </span>

          <input
            type="checkbox"
            checked={Boolean(
              app.settings.autoSpeak
            )}
            onChange={(event) => {
              app.updateSetting(
                "autoSpeak",
                event.target.checked
              );

              if (
                !event.target.checked
              ) {
                app.updateSetting(
                  "voiceHandsFree",
                  false
                );
              }
            }}
          />
        </label>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>
              Read code aloud
            </strong>

            <small>
              Include fenced code blocks in spoken responses instead of skipping them.
            </small>
          </span>

          <input
            type="checkbox"
            checked={Boolean(
              app.settings.voiceReadCode
            )}
            onChange={(event) =>
              app.updateSetting(
                "voiceReadCode",
                event.target.checked
              )
            }
          />
        </label>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>
              Skip URLs
            </strong>

            <small>
              Avoid reading long web addresses character by character.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              app.settings.voiceSkipUrls !==
              false
            }
            onChange={(event) =>
              app.updateSetting(
                "voiceSkipUrls",
                event.target.checked
              )
            }
          />
        </label>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>
              Voice preview
            </strong>

            <small>
              Play a short sample using the current language, voice and speed.
            </small>
          </span>

          <button
            type="button"
            className="settings-inline-button"
            onClick={() =>
              app.previewVoice?.()
            }
            disabled={
              !app.speechSynthesisSupported
            }
          >
            Play sample
          </button>
        </div>
      </section>


      <section className="settings-voice-section">
        <div className="settings-voice-heading">
          <span>
            Conversation
          </span>

          <small>
            Make Voice Mode feel more natural during back-and-forth conversation.
          </small>
        </div>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>
              Hands-free mode
            </strong>

            <small>
              After Codarox finishes speaking, automatically listen for your next message.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              Boolean(
                app.settings
                  .voiceHandsFree
              ) &&
              handsFreeAvailable
            }
            disabled={
              !handsFreeAvailable
            }
            onChange={(event) =>
              app.updateSetting(
                "voiceHandsFree",
                event.target.checked
              )
            }
          />
        </label>

        {!handsFreeAvailable && (
          <div className="settings-voice-note">
            Hands-free mode requires both “Send after speech ends” and “Speak responses automatically”.
          </div>
        )}

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>
              Stop playback when listening starts
            </strong>

            <small>
              Immediately stop spoken output when you start a new voice input.
            </small>
          </span>

          <input
            type="checkbox"
            checked={
              app.settings
                .voiceStopPlaybackOnListen !==
              false
            }
            onChange={(event) =>
              app.updateSetting(
                "voiceStopPlaybackOnListen",
                event.target.checked
              )
            }
          />
        </label>
      </section>


      <section className="settings-voice-section">
        <div className="settings-voice-heading">
          <span>
            Diagnostics
          </span>

          <small>
            Check browser support and verify that your microphone is receiving audio.
          </small>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>
              Speech recognition
            </strong>

            <small>
              Browser support for turning speech into text.
            </small>
          </span>

          <span
            className={
              "settings-pill settings-voice-status " +
              (
                app.speechSupported
                  ? "is-good"
                  : "is-warn"
              )
            }
          >
            {app.speechSupported
              ? "Supported"
              : "Unavailable"}
          </span>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>
              Speech synthesis
            </strong>

            <small>
              Browser support for reading assistant responses aloud.
            </small>
          </span>

          <span
            className={
              "settings-pill settings-voice-status " +
              (
                app
                  .speechSynthesisSupported
                  ? "is-good"
                  : "is-warn"
              )
            }
          >
            {app.speechSynthesisSupported
              ? "Supported"
              : "Unavailable"}
          </span>
        </div>

        <div className="settings-mic-test-row">
          <div className="settings-mic-test-copy">
            <span className="settings-row-copy">
              <strong>
                Microphone test
              </strong>

              <small>
                {app.micTestError ||
                  (
                    app.micTesting
                      ? "Speak normally and confirm that the input meter responds."
                      : "Uses your browser's default microphone only while this test is active."
                  )}
              </small>
            </span>

            <button
              type="button"
              className={
                "settings-inline-button " +
                (
                  app.micTesting
                    ? "settings-mic-stop"
                    : ""
                )
              }
              onClick={() =>
                app.toggleMicrophoneTest?.()
              }
            >
              {app.micTesting
                ? "Stop test"
                : "Test microphone"}
            </button>
          </div>

          <div
            className="settings-mic-meter"
            aria-label="Microphone input level"
          >
            <span
              style={{
                width:
                  Math.round(
                    (
                      app.micLevel ||
                      0
                    ) * 100
                  ) + "%"
              }}
            />
          </div>
        </div>

        <div className="settings-info-row settings-reset-row">
          <span className="settings-row-copy">
            <strong>
              Reset voice settings
            </strong>

            <small>
              Restore Codarox voice preferences to their recommended defaults.
            </small>
          </span>

          <button
            type="button"
            className="settings-inline-button"
            onClick={
              resetVoiceSettings
            }
          >
            Reset
          </button>
        </div>
      </section>

    </div>
  );
}

function formatLocalDataSize(bytes) {
  const value = Number(bytes || 0);

  if (value < 1024) {
    return value + " B";
  }

  if (value < 1024 * 1024) {
    return (value / 1024).toFixed(1) + " KB";
  }

  if (value < 1024 * 1024 * 1024) {
    return (
      value /
      (1024 * 1024)
    ).toFixed(1) + " MB";
  }

  return (
    value /
    (1024 * 1024 * 1024)
  ).toFixed(2) + " GB";
}


function estimateCodaroxLocalStorage() {
  let bytes = 0;

  try {
    const encoder =
      new TextEncoder();

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(index);

      if (!key) continue;

      if (
        !key.startsWith("codarox-") &&
        key !== "theme"
      ) {
        continue;
      }

      const value =
        localStorage.getItem(key) ||
        "";

      bytes +=
        encoder.encode(key).length;

      bytes +=
        encoder.encode(value).length;
    }
  } catch {
    return 0;
  }

  return bytes;
}


function AccountPanel({ app }) {
  const [
    storageBytes,
    setStorageBytes,
  ] = useState(
    () =>
      estimateCodaroxLocalStorage()
  );


  /*
   * Real browser storage estimate.
   * This also includes IndexedDB image cache
   * when the browser supports StorageManager.
   */
  useEffect(() => {
    let cancelled = false;

    async function refreshStorageUsage() {
      let usage =
        estimateCodaroxLocalStorage();

      try {
        if (
          navigator.storage?.estimate
        ) {
          const estimate =
            await navigator.storage
              .estimate();

          usage =
            Number(
              estimate?.usage ||
              usage
            );
        }
      } catch {
        // LocalStorage estimate stays
        // as the fallback.
      }

      if (!cancelled) {
        setStorageBytes(usage);
      }
    }

    refreshStorageUsage();

    return () => {
      cancelled = true;
    };
  }, [
    app.history,
    app.settings,
  ]);


  /*
   * Export conversations + preferences.
   * Provider keys stay on backend and are
   * never part of this file.
   */
  function exportLocalData() {
    const payload = {
      product: "Codarox AI",
      schemaVersion: 1,
      exportedAt:
        new Date().toISOString(),

      storage:
        "local-browser",

      note:
        "Generated image binary cache is not included in this JSON export.",

      settings:
        app.settings,

      conversations:
        app.history,
    };


    const blob =
      new Blob(
        [
          JSON.stringify(
            payload,
            null,
            2
          ),
        ],
        {
          type:
            "application/json",
        }
      );


    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);


    link.href = url;

    link.download =
      "codarox-ai-export-" +
      date +
      ".json";


    document.body
      .appendChild(link);

    link.click();

    link.remove();


    window.setTimeout(
      () =>
        URL.revokeObjectURL(url),
      0
    );
  }


  /*
   * Full local reset.
   *
   * Removes:
   * - conversations
   * - settings
   * - usage counters
   * - sidebar state
   * - last conversation
   * - image IndexedDB cache
   *
   * Does NOT touch backend .env/API keys.
   */
  async function resetCodaroxAI() {
    const confirmed =
      window.confirm(
        "Reset Codarox AI on this browser? This will permanently remove local conversations, preferences, usage data and the generated image cache."
      );

    if (!confirmed) {
      return;
    }


    app.stopMicrophoneTest?.();

    app.recognitionRef
      ?.current
      ?.abort?.();

    window.speechSynthesis
      ?.cancel?.();


    /*
     * Remove Codarox localStorage only.
     */
    const localKeys = [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(index);

      if (
        key &&
        (
          key.startsWith(
            "codarox-"
          ) ||
          key === "theme"
        )
      ) {
        localKeys.push(key);
      }
    }


    localKeys.forEach(
      (key) =>
        localStorage.removeItem(
          key
        )
    );


    /*
     * Remove optional session storage.
     */
    try {
      const sessionKeys = [];

      for (
        let index = 0;
        index < sessionStorage.length;
        index += 1
      ) {
        const key =
          sessionStorage.key(index);

        if (
          key?.startsWith(
            "codarox-"
          )
        ) {
          sessionKeys.push(key);
        }
      }

      sessionKeys.forEach(
        (key) =>
          sessionStorage.removeItem(
            key
          )
      );
    } catch {
      // SessionStorage is optional.
    }


    /*
     * Remove generated-image IndexedDB.
     */
    try {
      if (window.indexedDB) {
        await new Promise(
          (resolve) => {
            const request =
              indexedDB.deleteDatabase(
                "codarox-ai-images-v1"
              );

            let resolved = false;

            const finish = () => {
              if (resolved) return;

              resolved = true;
              resolve();
            };

            request.onsuccess =
              finish;

            request.onerror =
              finish;

            request.onblocked =
              finish;

            window.setTimeout(
              finish,
              800
            );
          }
        );
      }
    } catch {
      // Reload still resets the app
      // if IndexedDB is unavailable.
    }


    window.location.reload();
  }


  return (
    <div className="settings-panel-section">

      <div className="settings-info-row">
        <span className="settings-row-copy">
          <strong>
            No account required
          </strong>

          <small>
            Codarox AI works without registration. Saved conversations and preferences are stored in this browser.
          </small>
        </span>

        <span className="settings-pill">
          Local
        </span>
      </div>


      <div className="settings-info-row">
        <span className="settings-row-copy">
          <strong>
            Conversation history
          </strong>

          <small>
            Conversations currently saved on this device.
          </small>
        </span>

        <span className="settings-pill">
          {app.history.length}
        </span>
      </div>


      <div className="settings-info-row">
        <span className="settings-row-copy">
          <strong>
            Storage usage
          </strong>

          <small>
            Approximate browser storage used by this Codarox AI origin, including the generated image cache.
          </small>
        </span>

        <span className="settings-pill">
          {formatLocalDataSize(
            storageBytes
          )}
        </span>
      </div>


      <div className="settings-info-row">
        <span className="settings-row-copy">
          <strong>
            Export data
          </strong>

          <small>
            Download saved conversations and preferences as JSON. Backend provider keys are never included.
          </small>
        </span>

        <button
          type="button"
          className="settings-inline-button"
          onClick={exportLocalData}
        >
          Export
        </button>
      </div>


      <div className="settings-info-row">
        <span className="settings-row-copy">
          <strong>
            Clear conversation history
          </strong>

          <small>
            Remove all saved conversations from this browser.
          </small>
        </span>

        <button
          type="button"
          className="settings-inline-button danger"
          onClick={app.clearHistory}
          disabled={!app.history.length}
        >
          Clear
        </button>
      </div>


      <div className="settings-info-row">
        <span className="settings-row-copy">
          <strong>
            Reset Codarox AI
          </strong>

          <small>
            Erase local conversations, preferences, usage data and generated image cache, then restore defaults.
          </small>
        </span>

        <button
          type="button"
          className="settings-inline-button danger"
          onClick={resetCodaroxAI}
        >
          Reset
        </button>
      </div>

    </div>
  );
}

function AdvancedPanel({ app }) {
  const currentModel = getModelOption(app.settings.model || "auto");
  const autoRouting = (app.settings.model || "auto") === "auto";

  const openRouterLabel = app.openRouterStatus?.loading
    ? "Checking"
    : app.openRouterStatus?.ok
      ? "Connected"
      : "Unavailable";

  const responseBudget = Number(app.settings.maxTokens || 8192);

  function resetAdvancedTuning() {
    app.updateSetting("temperature", 0.35);
    app.updateSetting("maxTokens", 8192);
    app.updateSetting("reducedMotion", false);
    app.updateSetting("showModelMetadata", true);
  }

  return (
    <div className="settings-advanced-page">

      <section className="settings-advanced-section">
        <div className="settings-advanced-heading">
          <span>Generation</span>
          <small>Fine-tune how Codarox generates responses.</small>
        </div>

        <div className="settings-split-row">
          <span className="settings-row-copy">
            <strong>Creativity</strong>
            <small>
              Lower values are more deterministic; higher values allow more variation.
            </small>
          </span>

          <div className="settings-slider-group">
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.05"
              value={app.settings.temperature}
              onChange={(event) =>
                app.updateSetting(
                  "temperature",
                  Number(event.target.value)
                )
              }
            />

            <span>
              {Number(app.settings.temperature).toFixed(2)}
            </span>
          </div>
        </div>

        <label className="settings-split-row">
          <span className="settings-row-copy">
            <strong>Output budget</strong>
            <small>
              Maximum response budget sent to the selected AI provider.
            </small>
          </span>

          <select
            value={
              responseBudget <= 2048
                ? 2048
                : responseBudget <= 8192
                  ? 8192
                  : responseBudget <= 16384
                    ? 16384
                    : 32768
            }
            onChange={(event) =>
              app.updateSetting(
                "maxTokens",
                Number(event.target.value)
              )
            }
          >
            <option value={2048}>2K · Concise</option>
            <option value={8192}>8K · Balanced</option>
            <option value={16384}>16K · Detailed</option>
            <option value={32768}>32K · Maximum</option>
          </select>
        </label>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>Current model</strong>
            <small>
              {currentModel.provider} · {currentModel.contextLabel} context.
            </small>
          </span>

          <div className="settings-advanced-actions">
            <span className="settings-pill">
              {currentModel.shortLabel}
            </span>

            <button
              type="button"
              className="settings-inline-button"
              onClick={() => app.setSettingsView("models")}
            >
              Manage
            </button>
          </div>
        </div>
      </section>

      <section className="settings-advanced-section">
        <div className="settings-advanced-heading">
          <span>Behavior</span>
          <small>
            Control advanced interface behavior without changing the selected model.
          </small>
        </div>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>Reduced motion</strong>
            <small>
              Minimize interface animations and transitions across Codarox AI.
            </small>
          </span>

          <input
            type="checkbox"
            checked={Boolean(app.settings.reducedMotion)}
            onChange={(event) =>
              app.updateSetting(
                "reducedMotion",
                event.target.checked
              )
            }
          />
        </label>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>Show model metadata</strong>
            <small>
              Display the model used next to assistant responses.
            </small>
          </span>

          <input
            type="checkbox"
            checked={app.settings.showModelMetadata !== false}
            onChange={(event) =>
              app.updateSetting(
                "showModelMetadata",
                event.target.checked
              )
            }
          />
        </label>

        <label className="settings-split-row settings-toggle-row">
          <span className="settings-row-copy">
            <strong>Automatic chat titles</strong>
            <small>
              Generate a descriptive title for new conversations.
            </small>
          </span>

          <input
            type="checkbox"
            checked={Boolean(app.settings.aiTitles)}
            onChange={(event) =>
              app.updateSetting(
                "aiTitles",
                event.target.checked
              )
            }
          />
        </label>
      </section>

      <section className="settings-advanced-section">
        <div className="settings-advanced-heading">
          <span>Reliability</span>
          <small>
            Live routing and provider resilience used by the Codarox backend.
          </small>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>Automatic failover</strong>
            <small>
              Auto mode can move across configured Google and OpenRouter routes when a route is unavailable.
            </small>
          </span>

          <span
            className={
              "settings-pill settings-health-pill " +
              (autoRouting ? "is-good" : "")
            }
          >
            {autoRouting ? "Active" : "Auto only"}
          </span>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>Provider retries</strong>
            <small>
              Transient provider failures are retried before the request is marked unavailable.
            </small>
          </span>

          <span className="settings-pill">
            Up to 2 attempts
          </span>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>Circuit protection</strong>
            <small>
              Repeatedly failing routes are paused temporarily instead of being called continuously.
            </small>
          </span>

          <span className="settings-pill settings-health-pill is-good">
            Enabled
          </span>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>OpenRouter status</strong>
            <small>
              {app.openRouterStatus?.error
                ? "The status endpoint is currently unavailable."
                : "Connection status reported by the Codarox backend."}
            </small>
          </span>

          <span
            className={
              "settings-pill settings-health-pill " +
              (
                app.openRouterStatus?.ok
                  ? "is-good"
                  : app.openRouterStatus?.loading
                    ? ""
                    : "is-warn"
              )
            }
          >
            {openRouterLabel}
          </span>
        </div>
      </section>

      <section className="settings-advanced-section">
        <div className="settings-advanced-heading">
          <span>Developer</span>
          <small>
            Runtime information and maintenance controls.
          </small>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>Selected route</strong>
            <small>
              Provider family currently selected for new conversations.
            </small>
          </span>

          <span className="settings-pill">
            {currentModel.provider}
          </span>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>Context window</strong>
            <small>
              Maximum context advertised for the currently selected model route.
            </small>
          </span>

          <span className="settings-pill">
            {currentModel.contextLabel}
          </span>
        </div>

        <div className="settings-info-row">
          <span className="settings-row-copy">
            <strong>Settings storage</strong>
            <small>
              Preferences are saved automatically in this browser.
            </small>
          </span>

          <span className="settings-pill settings-health-pill is-good">
            Local · Auto-save
          </span>
        </div>

        <div className="settings-info-row settings-reset-row">
          <span className="settings-row-copy">
            <strong>Reset advanced tuning</strong>
            <small>
              Restore creativity, output budget, motion and metadata preferences to Codarox defaults.
            </small>
          </span>

          <button
            type="button"
            className="settings-inline-button"
            onClick={resetAdvancedTuning}
          >
            Reset
          </button>
        </div>
      </section>

    </div>
  );
}
