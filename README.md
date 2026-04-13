# CLAWDETTE CORE

CLAWDETTE CORE is a local-first neural operating system for Codex. The interface is a living pink synthetic brain rather than a dashboard shell.

## Current first pass

- Three.js neural scene with zoom-sensitive regions, traffic, and inspectable agent nodes
- Local-first persistence via filesystem-backed JSON stores
- Embedded agent thread view and message routing primitives
- Autosave and git checkpoint plumbing
- Whisper-compatible transcription endpoint contract
- Memory layers for executive, session, project, tasks, life admin, and state snapshots

## Run

```bash
npm install
npm run dev
```

## Local persistence

Structured state is stored under [`data/`](./data):

- `data/state/core-state.json`
- `data/messages/threads/*.json`
- `data/memory/*.json`
- `data/snapshots/*.json`
- `data/checkpoints/*.json`

## Notes

The transcription route supports a Whisper-compatible adapter shape. For real transcription, point the app at a local or remote service with:

- `WHISPER_TRANSCRIBE_URL`
- `WHISPER_API_KEY` optional
- `TWILIO_ACCOUNT_SID` optional
- `TWILIO_AUTH_TOKEN` optional
- `TWILIO_FROM_NUMBER` optional
- `TWILIO_ALERT_TO` optional
