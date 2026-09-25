import { Pencil, Pin, Trash2 } from "lucide-react";

export function HistoryRow({ app, item }) {
  const active = item.id === app.activeHistoryId;

  return (
    <div className={`history-row ${active ? "active" : ""} ${item.pinned ? "pinned" : ""}`}>
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
        <button
          type="button"
          className="history-main"
          onClick={() => app.openHistory(item)}
          title={item.preview}
          aria-current={active ? "page" : undefined}
        >
          <span>{item.title}</span>
        </button>
      )}

      <button
        type="button"
        className={`history-pin ${item.pinned ? "is-pinned" : ""}`}
        onClick={(event) => app.togglePin(item.id, event)}
        aria-label={item.pinned ? "Unpin conversation" : "Pin conversation"}
        title={item.pinned ? "Unpin conversation" : "Pin conversation"}
        aria-pressed={Boolean(item.pinned)}
      >
        <Pin size={13} fill={item.pinned ? "currentColor" : "none"} />
      </button>

      <button
        type="button"
        className="history-icon-button"
        onClick={(event) => app.beginRename(item, event)}
        aria-label="Rename conversation"
        title="Rename conversation"
      >
        <Pencil size={13} />
      </button>

      <button
        type="button"
        className="history-delete"
        onClick={(event) => app.deleteHistoryItem(item.id, event)}
        aria-label="Delete conversation"
        title="Delete conversation"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
