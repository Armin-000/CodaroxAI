import { useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "../config/constants.js";
import { useAttachments } from "../features/attachments/hooks/useAttachments.js";
import { useChatSession } from "../features/chat/hooks/useChatSession.js";
import { useHistory } from "../features/history/hooks/useHistory.js";
import { useSettings } from "../features/settings/hooks/useSettings.js";
import { useVoice } from "../features/voice/hooks/useVoice.js";

export function useAppController() {
  const settingsState = useSettings();
  const attachmentsState = useAttachments();
  const historyState = useHistory();
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.sidebar) !== "false");

  const speakRef = useRef(() => {});
  const voiceStateRef = useRef({ voiceMode: false, voiceEnabled: true });

  const chatState = useChatSession({
    settings: settingsState.settings,
    attachments: attachmentsState.attachments,
    setAttachments: attachmentsState.setAttachments,
    activeDocuments: attachmentsState.activeDocuments,
    setActiveDocuments: attachmentsState.setActiveDocuments,
    history: historyState.history,
    setHistory: historyState.setHistory,
    speak: (text) => speakRef.current(text),
    shouldSpeak: () => {
      const voice = voiceStateRef.current;
      return voice.voiceMode && voice.voiceEnabled && settingsState.settings.autoSpeak;
    },
  });

  const voiceState = useVoice({
    settings: settingsState.settings,
    input: chatState.input,
    setInput: chatState.setInput,
    streaming: chatState.streaming,
  });

  speakRef.current = voiceState.speak;
  voiceStateRef.current = {
    voiceMode: voiceState.voiceMode,
    voiceEnabled: voiceState.voiceEnabled,
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sidebar, sidebarOpen ? "true" : "false");
  }, [sidebarOpen]);

  useEffect(() => {
    function handleNewChatShortcut(event) {
      const isShortcut = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (!isShortcut) return;
      event.preventDefault();
      event.stopPropagation();
      chatState.resetChat();
    }
    window.addEventListener("keydown", handleNewChatShortcut);
    return () => window.removeEventListener("keydown", handleNewChatShortcut);
  }, []);

  function resetChat() {
    voiceState.recognitionRef.current?.abort?.();
    chatState.resetChat();
  }

  function openHistory(item) {
    voiceState.recognitionRef.current?.abort?.();
    chatState.openHistory(item);
  }

  function deleteHistoryItem(id, event) {
    event?.stopPropagation?.();
    historyState.setHistory((items) => items.filter((item) => item.id !== id));
    if (chatState.activeHistoryId === id) resetChat();
  }

  function clearHistory() {
    historyState.setHistory([]);
    if (chatState.activeHistoryId) resetChat();
  }

  function commitRename(id) {
    historyState.commitRename(id, (clean) => {
      if (chatState.activeHistoryId === id) chatState.setActiveTitle(clean);
    });
  }

  function toggleVoiceListening() {
    voiceState.toggleVoiceListening(chatState.submitMessage);
  }

  function openVoiceMode() {
    voiceState.openVoiceMode(chatState.submitMessage);
  }

  return {
    ...settingsState,
    ...attachmentsState,
    ...historyState,
    ...chatState,
    ...voiceState,
    sidebarOpen,
    setSidebarOpen,
    resetChat,
    openHistory,
    deleteHistoryItem,
    clearHistory,
    commitRename,
    toggleVoiceListening,
    openVoiceMode,
  };
}
