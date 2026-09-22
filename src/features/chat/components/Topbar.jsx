import { Headphones, Moon, Sun } from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";

export function Topbar() {
  const app = useApp();
  return (
    <header className="topbar">
      <div className="topbar-left" />
      <div className="topbar-actions">
        <button className="icon-button" onClick={app.toggleTheme}>
          {app.dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="voice-top-button" onClick={app.openVoiceMode}>
          <Headphones size={17} /> Voice
        </button>
      </div>
    </header>
  );
}
