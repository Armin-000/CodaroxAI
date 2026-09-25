import { RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function UserMessageEditor({
  message,
  onCancel,
  onSave,
}) {
  const [value, setValue] = useState(message.content || "");
  const textareaRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  async function save() {
    const clean = value.trim();
    const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;

    if ((!clean && !hasAttachments) || savingRef.current) return;

    savingRef.current = true;
    try {
      const accepted = await onSave(clean);
      if (accepted !== false) onCancel();
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <div className="user-message-editor">
      <textarea
        ref={textareaRef}
        value={value}
        rows={3}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }

          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            save();
          }
        }}
      />

      <div className="user-message-editor-actions">
        <button type="button" className="edit-cancel" onClick={onCancel}>
          <X size={14} />
          Cancel
        </button>

        <button
          type="button"
          className="edit-save"
          onClick={save}
          disabled={!value.trim() && !message.attachments?.length}
        >
          <RefreshCw size={14} />
          Save & regenerate
        </button>
      </div>

      <div className="user-message-editor-hint">
        Cmd/Ctrl + Enter to save · Esc to cancel
      </div>
    </div>
  );
}
