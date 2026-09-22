import { Check, X } from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";
import { MODEL_OPTIONS, getModelOption } from "../../models/modelCatalog.js";

const VIEW_META = {
  general: ["General", "Manage language and interaction preferences."],
  design: ["Design", "Customize appearance and readability."],
  models: ["Models", "Choose how Codarox routes AI responses."],
  responses: ["Responses", "Control how Codarox writes and responds."],
  voice: ["Voice", "Speech recognition and spoken playback."],
  account: ["Account", "Workspace status and local saved data."],
  advanced: ["Advanced", "Adjust deeper behavior and model controls."],
};

const NAV_ITEMS = [
  ["general", "General", "Language and input"],
  ["design", "Design", "Theme and typography"],
  ["models", "Models", "AI model selection"],
  ["responses", "Responses", "Length and style"],
  ["voice", "Voice", "Speech settings"],
  ["account", "Account", "Workspace and data"],
  ["advanced", "Advanced", "Technical controls"],
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
            {NAV_ITEMS.map(([id, label, detail]) => (
              <button
                type="button"
                key={id}
                className={`settings-nav-item ${app.settingsView === id ? "active" : ""}`}
                onClick={() => app.setSettingsView(id)}
              >
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
        <span className="settings-row-copy"><strong>Language</strong><small>Language used for AI responses.</small></span>
        <select value={app.settings.language} onChange={(event) => app.updateSetting("language", event.target.value)}>
          <option value="auto">Auto</option><option value="hr">Croatian</option><option value="en">English</option>
        </select>
      </label>
      <label className="settings-split-row">
        <span className="settings-row-copy"><strong>Enter to send</strong><small>Otherwise use Cmd/Ctrl + Enter.</small></span>
        <input type="checkbox" checked={app.settings.enterToSend} onChange={(event) => app.updateSetting("enterToSend", event.target.checked)} />
      </label>
    </div>
  );
}

function DesignPanel({ app }) {
  return (
    <div className="settings-panel-section">
      <label className="settings-split-row">
        <span className="settings-row-copy"><strong>Theme</strong><small>Match your system or choose an appearance.</small></span>
        <select value={app.settings.theme} onChange={(event) => app.updateSetting("theme", event.target.value)}>
          <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
        </select>
      </label>
      <label className="settings-split-row">
        <span className="settings-row-copy"><strong>Chat font size</strong><small>Size of messages and composer text.</small></span>
        <select value={app.settings.fontSize} onChange={(event) => app.updateSetting("fontSize", Number(event.target.value))}>
          {[15,16,17,18].map((size) => <option key={size} value={size}>{size}px</option>)}
        </select>
      </label>
      <div className="settings-preview-box"><span className="settings-preview-label">Preview</span><div className="settings-preview-message">Codarox AI responses will look like this.</div></div>
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
                  <td><strong>{model.shortLabel}</strong></td><td>{model.provider}</td><td>{model.contextLabel}</td><td>{model.inputs}</td><td>{model.bestFor}</td>
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
  const length = app.settings.maxTokens <= 2048 ? 2048 : app.settings.maxTokens <= 8192 ? 8192 : app.settings.maxTokens <= 16384 ? 16384 : 32768;
  return (
    <div className="settings-panel-section">
      <label className="settings-split-row">
        <span className="settings-row-copy"><strong>Response length</strong><small>Choose how much detail Codarox should provide.</small></span>
        <select value={length} onChange={(event) => app.updateSetting("maxTokens", Number(event.target.value))}>
          <option value={2048}>Concise</option><option value={8192}>Balanced</option><option value={16384}>Detailed</option><option value={32768}>Maximum</option>
        </select>
      </label>
      <label className="settings-textarea-row">
        <span className="settings-row-copy"><strong>Custom instructions</strong><small>Preferences Codarox should follow in its responses.</small></span>
        <textarea value={app.settings.systemInstructions} maxLength={3000} onChange={(event) => app.updateSetting("systemInstructions", event.target.value)} placeholder="Example: Keep responses concise and use Croatian technical terminology." />
      </label>
      <label className="settings-split-row">
        <span className="settings-row-copy"><strong>Generate chat titles</strong><small>Automatically create descriptive titles for new conversations.</small></span>
        <input type="checkbox" checked={app.settings.aiTitles} onChange={(event) => app.updateSetting("aiTitles", event.target.checked)} />
      </label>
    </div>
  );
}

function VoicePanel({ app }) {
  return (
    <div className="settings-panel-section">
      <label className="settings-split-row">
        <span className="settings-row-copy"><strong>Voice language</strong><small>Speech recognition and spoken replies.</small></span>
        <select value={app.settings.voiceLanguage} onChange={(event) => app.updateSetting("voiceLanguage", event.target.value)}>
          <option value="auto">Auto</option><option value="hr-HR">Croatian</option><option value="en-US">English</option>
        </select>
      </label>
      <label className="settings-split-row">
        <span className="settings-row-copy"><strong>Speech speed</strong><small>Text-to-speech playback rate.</small></span>
        <select value={app.settings.voiceRate} onChange={(event) => app.updateSetting("voiceRate", Number(event.target.value))}>
          <option value={0.85}>0.85×</option><option value={1}>1.0×</option><option value={1.15}>1.15×</option><option value={1.3}>1.3×</option>
        </select>
      </label>
      <label className="settings-split-row">
        <span className="settings-row-copy"><strong>Speak responses automatically</strong><small>Read completed AI responses aloud in Voice Mode.</small></span>
        <input type="checkbox" checked={app.settings.autoSpeak} onChange={(event) => app.updateSetting("autoSpeak", event.target.checked)} />
      </label>
    </div>
  );
}

function AccountPanel({ app }) {
  return (
    <div className="settings-panel-section">
      <div className="settings-info-row"><span className="settings-row-copy"><strong>Workspace</strong><small>Codarox is currently running locally in this browser.</small></span><span className="settings-pill">Local</span></div>
      <div className="settings-info-row"><span className="settings-row-copy"><strong>Conversation history</strong><small>Saved in this browser.</small></span><span className="settings-pill">{app.history.length}</span></div>
      <div className="settings-info-row"><span className="settings-row-copy"><strong>Providers</strong><small>Keys are configured on the backend only.</small></span><span className="settings-pill">Google + OpenRouter</span></div>
      <div className="settings-info-row">
        <span className="settings-row-copy"><strong>Clear history</strong><small>Remove all locally saved conversations.</small></span>
        <button type="button" className="settings-inline-button danger" onClick={() => { if (window.confirm("Clear all saved conversations?")) app.clearHistory(); }}>Clear</button>
      </div>
    </div>
  );
}

function AdvancedPanel({ app }) {
  return (
    <div className="settings-panel-section">
      <div className="settings-split-row">
        <span className="settings-row-copy"><strong>Creativity</strong><small>Lower values are more deterministic and consistent.</small></span>
        <div className="settings-slider-group">
          <input type="range" min="0" max="1.2" step="0.05" value={app.settings.temperature} onChange={(event) => app.updateSetting("temperature", Number(event.target.value))} />
          <span>{Number(app.settings.temperature).toFixed(2)}</span>
        </div>
      </div>
      <div className="settings-info-row">
        <span className="settings-row-copy"><strong>Model controls</strong><small>Model selection and provider details live in Models.</small></span>
        <button type="button" className="settings-inline-button" onClick={() => app.setSettingsView("models")}>Open models</button>
      </div>
    </div>
  );
}
