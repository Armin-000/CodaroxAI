import { ArrowUp, AudioLines, FileText, Image as ImageIcon, Mic, Plus, Square, X } from "lucide-react";
import { useApp } from "../../../app/AppContext.jsx";
import { ModelPicker } from "../../models/components/ModelPicker.jsx";
import { formatFileSize } from "../../../lib/format.js";

export function Composer() {
  const app = useApp();
  return (
    <section className="composer-wrap">
      {app.activeDocuments.length > 0 && (
        <div className="document-mode-bar">
          <div className="document-mode-title"><FileText size={14} /><span>Document mode</span></div>
          <div className="document-mode-files">
            {app.activeDocuments.map((document) => (
              <div className="active-document-chip" key={document.id} title="This document is included with each new question in this chat">
                <span>{document.name}</span>
                <button onClick={() => app.removeActiveDocument(document.id)} aria-label={`Remove ${document.name}`}><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`composer ${app.listening ? "listening" : ""} ${app.dragActive ? "drag-active" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); app.setDragActive(true); }}
        onDragOver={(event) => { event.preventDefault(); app.setDragActive(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) app.setDragActive(false); }}
        onDrop={app.handleDrop}
      >
        <input
          ref={app.fileInputRef}
          className="attachment-input"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.html,.css,.py,.java,.c,.cpp,.h"
          onChange={app.handleAttachmentChange}
        />

        {app.dragActive && <div className="drop-overlay"><Plus size={20} /> Drop files to attach</div>}

        {app.attachments.length > 0 && (
          <div className="attachment-strip">
            {app.attachments.map((attachment) => (
              <div className="attachment-chip" key={attachment.id}>
                {attachment.kind === "image" && attachment.data
                  ? <img className="attachment-preview" src={attachment.data} alt={attachment.name} />
                  : <span className="attachment-file-icon">{attachment.kind === "image" ? <ImageIcon size={18} /> : <FileText size={18} />}</span>}
                <div className="attachment-copy">
                  <span className="attachment-name">{attachment.name}</span>
                  <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                </div>
                <button className="attachment-remove" onClick={() => app.removeAttachment(attachment.id)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={app.textareaRef}
          value={app.input}
          onChange={(event) => app.setInput(event.target.value)}
          onKeyDown={app.handleKeyDown}
          onPaste={app.handleComposerPaste}
          placeholder={app.listening ? "Listening…" : "Message Codarox AI"}
          rows={1}
          aria-label="Message Codarox AI"
        />

        <div className="composer-bottom">
          <div className="composer-tools">
            <button className="tool-button" type="button" onClick={() => app.fileInputRef.current?.click()} disabled={app.streaming} title="Attach images or documents"><Plus size={18} /></button>
            <button className={`tool-button ${app.listening ? "active" : ""}`} onClick={app.toggleVoiceListening} disabled={!app.speechSupported || app.streaming} title="Voice input">
              {app.listening ? <AudioLines size={18} /> : <Mic size={18} />}
            </button>
          </div>

          <div className="composer-actions-right">
            <ModelPicker
              value={app.settings.model || "auto"}
              disabled={app.streaming}
              onChange={(value) => app.updateSetting("model", value)}
            />
            {app.streaming ? (
              <button className="send-button stop-button" onClick={app.stopGeneration} aria-label="Stop"><Square size={14} fill="currentColor" /></button>
            ) : (
              <button className="send-button" disabled={!app.input.trim() && app.attachments.length === 0} onClick={() => app.submitMessage()} aria-label="Send"><ArrowUp size={18} /></button>
            )}
          </div>
        </div>
      </div>
      <div className="composer-hint">AI can make mistakes. Verify important information.</div>
    </section>
  );
}
