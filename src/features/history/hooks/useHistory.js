import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../../../config/constants.js";
import { loadHistory } from "../../../lib/storage.js";

const HISTORY_LIMIT = 40;

function byRecent(a, b) {
  return Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0);
}

function trimHistory(items) {
  const ordered = [...items].sort(byRecent);
  if (ordered.length <= HISTORY_LIMIT) return ordered;

  const priority = [...ordered].sort((a, b) => {
    const pinned = Number(Boolean(b?.pinned)) - Number(Boolean(a?.pinned));
    return pinned || byRecent(a, b);
  });

  const keep = new Set(priority.slice(0, HISTORY_LIMIT).map((item) => item.id));
  return ordered.filter((item) => keep.has(item.id));
}

export function useHistory() {
  const [history, setHistory] = useState(() => trimHistory(loadHistory()));
  const [historySearch, setHistorySearch] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return history;

    return history.filter((item) =>
      `${item.title || ""} ${item.preview || ""}`.toLowerCase().includes(query)
    );
  }, [history, historySearch]);

  const { pinnedHistory, recentHistory } = useMemo(() => ({
    pinnedHistory: filteredHistory.filter((item) => item.pinned),
    recentHistory: filteredHistory.filter((item) => !item.pinned),
  }), [filteredHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history]);

  const upsertHistoryEntry = useCallback((entry) => {
    if (!entry?.id) return;

    setHistory((items) => {
      const existing = items.find((item) => item.id === entry.id);
      const merged = {
        ...existing,
        ...entry,
        pinned: Boolean(existing?.pinned),
      };

      return trimHistory([
        merged,
        ...items.filter((item) => item.id !== entry.id),
      ]);
    });
  }, []);

  const updateHistoryEntry = useCallback((id, patch) => {
    if (!id) return;

    setHistory((items) =>
      items.map((item) => item.id === id ? { ...item, ...patch } : item)
    );
  }, []);

  const togglePin = useCallback((id, event) => {
    event?.stopPropagation?.();

    setHistory((items) =>
      items.map((item) =>
        item.id === id ? { ...item, pinned: !item.pinned } : item
      )
    );
  }, []);

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

    updateHistoryEntry(id, { title: clean });
    onActiveRename?.(clean);
    setRenamingId(null);
  }

  return {
    history,
    setHistory,
    filteredHistory,
    pinnedHistory,
    recentHistory,
    historySearch,
    setHistorySearch,
    renamingId,
    setRenamingId,
    renameValue,
    setRenameValue,
    upsertHistoryEntry,
    updateHistoryEntry,
    togglePin,
    beginRename,
    commitRename,
  };
}
