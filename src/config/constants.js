export const INITIAL_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I’m Codarox AI. Ask me anything, attach a document, or start Voice Mode.",
};

export const STARTERS = [
  "Explain a concept step by step",
  "Help me debug or write code",
  "Summarize a document or image",
  "Draft a professional message",
];

export const STORAGE_KEYS = {
  history: "codarox-ai-history-v2",
  settings: "codarox-ai-settings-v1",
  requests: "codarox-ai-requests-v1",
  sidebar: "codarox-sidebar-open",
  lastConversation: "codarox-ai-last-conversation-v1",
};

export const DEFAULT_CONTEXT_LIMIT = 262144;
export const CONTEXT_WARNING_AT = 0.8;
export const CONTEXT_DANGER_AT = 0.9;
export const CONTEXT_HARD_STOP_AT = 0.95;

export const DEFAULT_SETTINGS = {
  model: "auto",
  settingsVersion: 2,
  language: "auto",
  fontSize: 16,
  messageWidth: "comfortable",
  interfaceDensity: "comfortable",
  codeFontSize: "normal",
  enterToSend: true,
  restoreLastConversation: true,
  focusComposerAutomatically: true,
  confirmBeforeDelete: true,
  theme: "system",
  temperature: 0.35,
  maxTokens: 8192,
  systemInstructions: "",
  responseTone: "auto",
  preferredTerminal: "auto",
  preferCompleteCode: true,
  aiTitles: false,
  voiceLanguage: "auto",
  voiceRate: 1,
  autoSpeak: true,
  reducedMotion: false,
  showModelMetadata: true,
  voiceName: "auto",
  voiceAutoSend: true,
  voiceHandsFree: false,
  voiceStopPlaybackOnListen: true,
  voiceShowTranscript: true,
  voiceReadCode: false,
  voiceSkipUrls: true,
  dailyRequestLimit: 50,
};

export const ATTACHMENT_LIMITS = {
  maxFiles: 4,
  maxFileSize: 8 * 1024 * 1024,
  maxTotalSize: 16 * 1024 * 1024,
  maxTextSize: 1024 * 1024,
};
