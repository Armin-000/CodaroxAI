import { AudioLines, Mic, Square, Volume2, VolumeX, X } from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";
import { Logo } from "../../../components/ui/Logo.jsx";

export function VoiceModal() {
  const app = useApp();
  if (!app.voiceMode) return null;

  return (
    <div className="voice-overlay">
      <div className="voice-panel">
        <div className="voice-header">
          <div className="brand"><Logo size={26} /><span>Voice Mode</span></div>
          <div className="voice-header-actions">
            <button className="icon-button glass" onClick={app.toggleVoiceOutput}>{app.voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
            <button className="icon-button glass" onClick={app.closeVoiceMode}><X size={19} /></button>
          </div>
        </div>
        <div className="voice-center">
          <div className={`voice-orb ${app.listening ? "is-listening" : ""} ${app.streaming ? "is-thinking" : ""}`}>
            <div className="orb-core"><AudioLines size={34} /></div><span className="orb-ring ring-one" /><span className="orb-ring ring-two" />
          </div>
          <div className="voice-status">
            <h2>{app.streaming ? "Thinking…" : app.listening ? "I’m listening" : "Ready when you are"}</h2>
            <p>{app.input || (app.speechSupported ? "Speak naturally." : "Speech recognition is not supported by this browser.")}</p>
          </div>
        </div>
        <div className="voice-controls">
          <button className={`voice-mic ${app.listening ? "active" : ""}`} onClick={app.toggleVoiceListening} disabled={!app.speechSupported || app.streaming}>
            {app.listening ? <Square size={19} fill="currentColor" /> : <Mic size={21} />}
          </button>
          <span>{app.listening ? "Tap to stop" : "Tap to speak"}</span>
        </div>
      </div>
    </div>
  );
}
