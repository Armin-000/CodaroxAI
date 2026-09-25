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
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (window.matchMedia?.("(max-width: 700px)").matches) return false;
    return localStorage.getItem(STORAGE_KEYS.sidebar) !== "false";
  });

  const speakRef = useRef(() => {});
  const voiceStateRef = useRef({ voiceMode: false, voiceEnabled: true });
  const restoreAttemptedRef = useRef(false);

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
    onFinalText: chatState.submitMessage,
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
    if (restoreAttemptedRef.current) return;

    restoreAttemptedRef.current = true;

    const focusComposer = () => {
      if (
        settingsState.settings
          .focusComposerAutomatically === false
      ) {
        return;
      }

      window.requestAnimationFrame(() => {
        window.setTimeout(
          () =>
            chatState.textareaRef.current
              ?.focus?.(),
          0
        );
      });
    };


    if (
      settingsState.settings
        .restoreLastConversation === false
    ) {
      focusComposer();
      return;
    }


    const storedId =
      localStorage.getItem(
        STORAGE_KEYS.lastConversation
      );


    /*
     * If the user intentionally left Codarox
     * on a fresh New chat, respect that.
     */
    if (storedId === "__new__") {
      focusComposer();
      return;
    }


    const item =
      historyState.history.find(
        (entry) =>
          entry.id === storedId
      ) ||
      (
        !storedId
          ? historyState.history[0]
          : null
      );


    if (item) {
      chatState.openHistory(item);

      localStorage.setItem(
        STORAGE_KEYS.lastConversation,
        item.id
      );
    }


    focusComposer();
  }, []);


  /*
   * When a new conversation gets its first saved ID,
   * remember it automatically.
   */
  useEffect(() => {
    if (
      !chatState.activeHistoryId
    ) {
      return;
    }

    localStorage.setItem(
      STORAGE_KEYS.lastConversation,
      chatState.activeHistoryId
    );
  }, [chatState.activeHistoryId]);

  useEffect(() => {
    function handleNewChatShortcut(event) {
      const isShortcut = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (!isShortcut) return;
      event.preventDefault();
      event.stopPropagation();
      resetChat();
    }
    window.addEventListener("keydown", handleNewChatShortcut);
    return () => window.removeEventListener("keydown", handleNewChatShortcut);
  }, [settingsState.settings.focusComposerAutomatically]);

  function focusComposerSoon() {
    if (
      settingsState.settings
        .focusComposerAutomatically === false
    ) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(
        () =>
          chatState.textareaRef.current
            ?.focus?.(),
        0
      );
    });
  }

  function resetChat() {
    voiceState.recognitionRef.current?.abort?.();

    chatState.resetChat();

    /*
     * Remember that the user deliberately
     * left the app on a fresh conversation.
     */
    localStorage.setItem(
      STORAGE_KEYS.lastConversation,
      "__new__"
    );

    focusComposerSoon();

    if (
      window.matchMedia?.(
        "(max-width: 700px)"
      ).matches
    ) {
      setSidebarOpen(false);
    }
  }

  function openHistory(item) {
    voiceState.recognitionRef.current?.abort?.();

    chatState.openHistory(item);

    localStorage.setItem(
      STORAGE_KEYS.lastConversation,
      item.id
    );

    focusComposerSoon();

    if (
      window.matchMedia?.(
        "(max-width: 700px)"
      ).matches
    ) {
      setSidebarOpen(false);
    }
  }

  function deleteHistoryItem(id, event) {
    event?.stopPropagation?.();

    if (
      settingsState.settings
        .confirmBeforeDelete !== false &&
      !window.confirm(
        "Delete this conversation?"
      )
    ) {
      return;
    }

    historyState.setHistory(
      (items) =>
        items.filter(
          (item) =>
            item.id !== id
        )
    );

    if (
      chatState.activeHistoryId === id
    ) {
      resetChat();
    }
  }

  function clearHistory() {
    if (
      historyState.history.length > 0 &&
      settingsState.settings
        .confirmBeforeDelete !== false &&
      !window.confirm(
        "Clear all saved conversations?"
      )
    ) {
      return;
    }

    historyState.setHistory([]);

    localStorage.setItem(
      STORAGE_KEYS.lastConversation,
      "__new__"
    );

    if (
      chatState.activeHistoryId
    ) {
      resetChat();
    } else {
      focusComposerSoon();
    }
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
