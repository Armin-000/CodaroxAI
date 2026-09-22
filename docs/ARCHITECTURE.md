# Codarox AI Architecture

Codarox AI is organized by **feature and responsibility**, not by file type alone.
The React application is a composition layer over feature hooks/components, while the
Node API separates HTTP routing, orchestration, providers, documents, language processing,
and streaming.

## Frontend

```text
src/
├── app/
│   ├── App.jsx                 # composition root
│   ├── AppContext.jsx          # app-level UI/controller context
│   ├── AppShell.jsx            # top-level visual shell
│   └── useAppController.js     # composes feature hooks
├── config/
│   └── constants.js
├── components/
│   └── ui/
│       └── Logo.jsx
├── features/
│   ├── attachments/
│   │   └── hooks/useAttachments.js
│   ├── chat/
│   │   ├── components/
│   │   │   ├── Composer.jsx
│   │   │   ├── Conversation.jsx
│   │   │   ├── MarkdownMessage.jsx
│   │   │   └── Topbar.jsx
│   │   └── hooks/useChatSession.js
│   ├── history/
│   │   └── hooks/useHistory.js
│   ├── models/
│   │   ├── components/ModelPicker.jsx
│   │   └── modelCatalog.js
│   ├── navigation/
│   │   └── components/Sidebar.jsx
│   ├── settings/
│   │   ├── components/SettingsModal.jsx
│   │   └── hooks/useSettings.js
│   └── voice/
│       ├── components/VoiceModal.jsx
│       └── hooks/useVoice.js
├── lib/
│   ├── context.js
│   ├── errors.js
│   ├── format.js
│   ├── ids.js
│   ├── messages.js
│   └── storage.js
└── styles/
    ├── base.css
    ├── navigation.css
    ├── chat.css
    ├── composer.css
    ├── settings-shell.css
    ├── settings-controls.css
    ├── settings-models.css
    ├── voice.css
    ├── markdown.css
    └── overrides.css
```

### Frontend boundaries

- **app/** only composes features. It does not implement provider or file-processing logic.
- **features/chat/** owns conversation state, streaming, retry/continue and chat UI.
- **features/settings/** owns persisted user preferences and Settings UI.
- **features/attachments/** owns browser file preparation and active document state.
- **features/voice/** owns browser speech recognition/synthesis.
- **features/history/** owns persisted conversation history and renaming/search.
- **features/models/** is the single source of truth for user-facing model metadata.
- **lib/** contains pure/shared utilities with no product UI.

## Backend

```text
server/
├── index.js                         # process bootstrap only
├── app.js                           # Express composition
├── config/
│   ├── env.js
│   └── models.js
├── routes/
│   ├── chat.routes.js
│   ├── health.routes.js
│   ├── provider.routes.js
│   └── title.routes.js
├── controllers/
│   ├── chat.controller.js
│   ├── provider.controller.js
│   └── title.controller.js
├── services/
│   ├── ai/
│   │   ├── messageAdapter.js
│   │   ├── modelRouter.js
│   │   ├── titleService.js
│   │   └── providers/
│   │       ├── gemini.provider.js
│   │       └── openrouter.provider.js
│   ├── documents/
│   │   └── documentService.js
│   └── language/
│       └── croatianNormalizer.js
├── prompts/
│   └── systemPrompt.js
├── streaming/
│   └── ndjson.js
├── middleware/
│   └── errorHandler.js
└── utils/
    └── http.js
```

### Request flow

```text
POST /api/chat
      │
      ▼
chat.controller
      │
      ▼
modelRouter
      │
      ├── Google Gemini provider
      │
      └── OpenRouter provider
             │
             ├── Ling
             └── Nemotron
```

`Auto` first attempts Gemini when `GEMINI_API_KEY` is configured. If Gemini fails before
streaming begins with a transient provider failure, routing falls back to OpenRouter/Ling.
A manually selected model stays on the explicitly selected provider.

### Streaming contract

Providers expose one normalized event contract to the controller:

- `delta` — incremental assistant text
- `usage` — token/context usage
- `replace` — final normalized text (for example Croatian cleanup)
- `error` — provider interruption after streaming begins
- `done` — final model/provider/finish metadata

React therefore does not contain provider-specific parsing.

## Design rules

1. `server/index.js` stays bootstrap-only.
2. Provider SDK/API details stay inside provider modules.
3. React components do not perform provider routing.
4. File parsing belongs to the documents service, not routes/controllers.
5. Persisted browser settings/history are accessed through their feature hooks.
6. New Settings sections are added as Settings feature UI, not inside `App.jsx`.
7. New providers implement the existing provider streaming contract and are registered in `modelRouter.js`.
