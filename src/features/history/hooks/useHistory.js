import { useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../../../config/constants.js";
import { loadHistory } from "../../../lib/storage.js";

export function useHistory() {
  const [history, setHistory] = useState(loadHistory);
  const [historySearch, setHistorySearch] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return history;
    return history.filter((item) => `${item.title || ""} ${item.preview || ""}`.toLowerCase().includes(query));
  }, [history, historySearch]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history]);

  function beginRename(item, event) {
    event?.stopPropagation?.();
    setRenamingId(item.id);
    setRenameValue(item.title || "Conversation");
  }

  function commitRename(id, onActiveRename) {
    const clean = renameValue.trim();
    if (!clean) {
      setRenamingId(null);
      return;
    }
    setHistory((items) => items.map((item) => item.id === id ? { ...item, title: clean } : item));
    onActiveRename?.(clean);
    setRenamingId(null);
  }

  return {
    history,
    setHistory,
    filteredHistory,
    historySearch,
    setHistorySearch,
    renamingId,
    setRenamingId,
    renameValue,
    setRenameValue,
    beginRename,
    commitRename,
  };
}
