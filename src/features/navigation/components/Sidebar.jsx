import {
  History,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";
import { Logo } from "../../../components/ui/Logo.jsx";
import { formatTokens } from "../../../lib/format.js";

export function Sidebar() {
  const app = useApp();

  return (
    <>
      <aside className={`sidebar ${app.sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-top">
          <div className="brand"><Logo size={28} /><span>Codarox AI</span></div>
          <button className="icon-button" aria-label="Close sidebar" onClick={() => app.setSidebarOpen(false)}>
            <PanelLeftClose size={18} />
          </button>
        </div>

        <button className="new-chat" onClick={app.resetChat}>
          <MessageSquarePlus size={17} />
          <span>New chat</span>
          <kbd>⌘ K</kbd>
        </button>

        <div className="side-section">
          <div className="side-label-row">
            <div className="side-label">Recent</div>
            {app.history.length > 0 && <button className="clear-history" onClick={app.clearHistory}>Clear</button>}
          </div>

          {app.history.length > 0 && (
            <div className="history-search">
              <Search size={14} />
              <input value={app.historySearch} onChange={(event) => app.setHistorySearch(event.target.value)} placeholder="Search chats" />
              {app.historySearch && (
                <button onClick={() => app.setHistorySearch("")} aria-label="Clear search"><X size={13} /></button>
              )}
            </div>
          )}

          {app.filteredHistory.map((item) => (
            <div key={item.id} className={`history-row ${item.id === app.activeHistoryId ? "active" : ""}`}>
              {app.renamingId === item.id ? (
                <input
                  className="history-rename-input"
                  value={app.renameValue}
                  autoFocus
                  onChange={(event) => app.setRenameValue(event.target.value)}
                  onBlur={() => app.commitRename(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") app.commitRename(item.id);
                    if (event.key === "Escape") app.setRenamingId(null);
                  }}
                />
              ) : (
                <button className="history-main" onClick={() => app.openHistory(item)} title={item.preview}>
                  <span>{item.title}</span>
                </button>
              )}
              <button className="history-icon-button" onClick={(event) => app.beginRename(item, event)} title="Rename conversation"><Pencil size={13} /></button>
              <button className="history-delete" onClick={(event) => app.deleteHistoryItem(item.id, event)} title="Delete conversation"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button className="sidebar-action" onClick={() => app.setSettingsOpen(true)}>
            <Settings2 size={17} /><span>Settings</span>
          </button>

          <div className="quota-summary-card quota-summary-simple">
            <div className="quota-summary-row">
              <span className="quota-summary-title">OpenRouter</span>
              <span className="quota-summary-plan">
                {app.openRouterStatus.loading
                  ? "Checking…"
                  : app.openRouterStatus.ok
                    ? app.openRouterStatus.isFreeTier ? "Free tier" : "Active"
                    : "Unavailable"}
              </span>
            </div>
          </div>

          <div className={`context-meter ${app.contextState}`}>
            <div className="context-meter-heading"><span>Active context</span><span>{Math.round(app.contextPercent)}%</span></div>
            <div className="context-progress" aria-label={`${Math.round(app.contextPercent)}% context used`}><span style={{ width: `${app.contextPercent}%` }} /></div>
            <div className="context-meter-meta">
              <span>{formatTokens(app.contextUsage.totalTokens)} / {formatTokens(app.contextUsage.contextLimit)}</span><span>tokens</span>
            </div>
            {app.contextState !== "normal" && (
              <div className="context-meter-note">
                {app.contextState === "full"
                  ? "Context is full — start a New chat."
                  : app.contextState === "danger"
                    ? "Almost full — start a new chat soon."
                    : "Long conversation — context is filling up."}
              </div>
            )}
          </div>
        </div>
      </aside>

      {!app.sidebarOpen && (
        <aside className="sidebar-dock" aria-label="Collapsed sidebar">
          <div className="dock-top">
            <div className="dock-logo" data-tooltip="Codarox AI"><Logo size={30} /></div>
            <button className="dock-button" onClick={() => app.setSidebarOpen(true)} data-tooltip="Open sidebar"><PanelLeftOpen size={20} /></button>
            <div className="dock-separator" />
            <button className="dock-button" onClick={app.resetChat} data-tooltip="New chat"><MessageSquarePlus size={20} /></button>
            <button className="dock-button" onClick={() => app.setSidebarOpen(true)} data-tooltip="Conversations"><History size={20} /></button>
          </div>
          <div className="dock-bottom">
            <button className="dock-button" onClick={() => app.setSettingsOpen(true)} data-tooltip="Settings"><Settings2 size={20} /></button>
            <div className="dock-quota" data-tooltip={`Local requests today: ${app.requestUsage.count}`}>{app.requestUsage.count}</div>
            <div className={`dock-context ${app.contextState}`} data-tooltip={`Active context ${Math.round(app.contextPercent)}%`}><span>{Math.round(app.contextPercent)}%</span></div>
          </div>
        </aside>
      )}
    </>
  );
}
