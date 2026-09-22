import { Composer } from "../features/chat/components/Composer.jsx";
import { Conversation } from "../features/chat/components/Conversation.jsx";
import { Topbar } from "../features/chat/components/Topbar.jsx";
import { Sidebar } from "../features/navigation/components/Sidebar.jsx";
import { SettingsModal } from "../features/settings/components/SettingsModal.jsx";
import { VoiceModal } from "../features/voice/components/VoiceModal.jsx";

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Topbar />
        <Conversation />
        <Composer />
      </main>
      <SettingsModal />
      <VoiceModal />
    </div>
  );
}
