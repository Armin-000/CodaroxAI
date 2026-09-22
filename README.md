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
- Hosted model access through OpenRouter
- Default model route: `openrouter/free`
- No local LLM required

## Requirements

- Node.js 20+ recommended
- Chrome or Edge recommended for browser speech recognition
- A free OpenRouter API key

## Setup

```bash
npm install
cp .env.example .env
```

Open `.env` and add your OpenRouter key:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
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

## Switch AI model

Change:

```env
OPENROUTER_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
```

to any OpenRouter model you have access to.

The backend uses Qwen3 Next 80B A3B Instruct (free) first and automatically falls back to NVIDIA Nemotron 3 Ultra (free) if the primary provider is temporarily unavailable.


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
