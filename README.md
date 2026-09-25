# Codarox AI — React voice chatbot

A polished, Vercel-inspired AI chat interface built with **React + Vite**.

## Features

- Clean Vercel/AI-style responsive interface
- Dark and light themes
- Streaming AI responses
- Markdown and code rendering
- Browser voice input (English)
- Browser text-to-speech for assistant replies
- Full-screen Voice Mode
- Conversation sidebar
- Safe backend API proxy: the AI key never ships to the browser
- Hosted model access through Google Gemini and OpenRouter
- Resilient Auto routing with provider/model failover and short circuit breaking
- No local LLM required

## Requirements

- Node.js 20+ recommended
- Chrome or Edge recommended for browser speech recognition
- At least one AI provider key: Google Gemini and/or OpenRouter

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and add at least one provider key. For the full Auto route, configure both:

```env
GEMINI_API_KEY=...
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=inclusionai/ling-3.0-flash-vl:free
```

Start development:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:8787
```

## Production

Build the React frontend:

```bash
npm run build
```

Then start the Node server:

```bash
npm start
```

The Express server automatically serves `dist/` when the build exists.

## Notes about voice

Speech input uses the browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
This works best in Chromium browsers such as Chrome and Edge.

Assistant speech uses the browser's built-in `speechSynthesis` API, so it does not require a paid TTS API.

## AI routing

The model picker controls manual model selection. In **Auto** mode, chat requests are routed in this order when the corresponding provider key is configured:

1. `gemini-3.8-flash`
2. `gemini-3.5-flash-lite`
3. `inclusionai/ling-3.0-flash-vl:free`
4. `openrouter/free`

Transient `5xx` failures receive at most one short backend retry. `429` rate limits immediately move to the next Auto candidate instead of repeatedly hitting the same route. Repeated provider failures temporarily open an in-memory circuit breaker so subsequent requests can reach a healthy route faster. Frontend-level duplicate retries are intentionally disabled.

`OPENROUTER_MODEL` is still used by auxiliary OpenRouter features such as title generation; chat model selection comes from the model picker / Auto router.


## Conversation context meter

The sidebar shows the real token usage reported by OpenRouter after each streamed response.
The backend requests in-stream usage accounting with `usage: { include: true }`.

Default UI safety thresholds:

- 80%: warning
- 90%: danger
- 95%: new messages are stopped and Codarox AI asks the user to open a New chat

The hard stop intentionally leaves a small safety reserve for message formatting and the next prompt.
The context safety limit is configured with:

```env
CONTEXT_LIMIT=262144
```

This is separate from OpenRouter's daily free-request quota. Opening a New chat resets conversation context, not the account's daily request allowance.


## v6 performance changes

- Token meter remains enabled using OpenRouter's returned usage data.
- Only the latest 24 user/assistant messages are sent to the model; full history is still stored and visible in the UI.
- OpenRouter provider routing is sorted by throughput for faster streaming.
- The very large Nemotron 3 Ultra fallback was replaced with same-model provider fallback (free).
- Assistant responses are capped at 2048 output tokens per request to avoid unexpectedly long generations.

The context meter now represents the **active context actually sent to the model**, which is the meaningful number for model limits.
