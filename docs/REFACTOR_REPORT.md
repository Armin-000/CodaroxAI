# Codarox AI Refactor Report

## What changed

The project was refactored from a monolithic prototype into feature-oriented frontend modules and layered backend services.

### Before

- `src/App.jsx`: 2,188 lines
- `src/styles.css`: 4,136 lines
- `server/index.js`: 892 lines
- `server/model-router.js`: 1,300 lines
- Provider logic, document parsing, Croatian normalization, routes and streaming were duplicated/intermixed.

### After

- `src/App.jsx`: 1-line compatibility export
- `src/app/App.jsx`: 12-line composition root
- `src/app/useAppController.js`: ~113 lines
- `src/features/chat/hooks/useChatSession.js`: ~438 lines (largest frontend behavior module)
- `src/features/settings/components/SettingsModal.jsx`: ~241 lines
- `server/index.js`: 9-line bootstrap
- `server/app.js`: ~32-line Express composition
- `server/services/ai/modelRouter.js`: ~80 lines
- Gemini and OpenRouter providers are independent modules
- CSS is split by feature/responsibility

## Behavior intentionally preserved

- OpenRouter + Gemini model selection
- Auto provider fallback
- Gemini streaming and transient retry behavior
- Ling / Nemotron routing
- image/PDF/text attachments
- active Document mode
- PDF page citation support
- Markdown/code rendering
- Croatian response normalization
- history/search/rename/delete
- AI-generated titles
- context meter
- Retry / Continue generating / Stop
- Voice Mode
- Settings sidebar and inline Models panel
- Cmd/Ctrl + K New chat
- light/dark/system themes

## Additional fixes made during refactor

- Removed duplicated legacy `/api/chat` implementation.
- Removed duplicated `res.json` / `buildMessages` remnants from the monolithic backend.
- The frontend `replace` stream event updates the intended assistant message by `targetId`.
- Gemini stream parser flushes the final `TextDecoder`/SSE buffer so the last chunk is not lost.
- Auto routing falls back only before response streaming begins.
- Unknown model selections safely resolve to `Auto`.
- Custom select-chevron CSS is consolidated into one cross-feature override.

## Validation performed in the refactor environment

- Every backend JavaScript module passed `node --check`.
- All frontend JS/JSX files passed TypeScript parser syntax validation.
- All relative JS/JSX imports were checked and resolve to existing files.
- All split CSS files passed `tinycss2` parsing with zero parse errors.
- Secret-pattern scan found no Gemini/OpenRouter API keys in the artifact.

A full Vite build could not be executed in the artifact environment because npm registry downloads were unavailable (`EAI_AGAIN`). Run `npm install` and `npm run check` locally before replacing your live branch.
