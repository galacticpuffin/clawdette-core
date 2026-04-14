# CLAWDETTE CORE Agent Guide

## Purpose

CLAWDETTE CORE is a local-first second-brain system built as a living neural intelligence environment rather than a dashboard. The repo is intended to support ongoing work by Codex, Claude, and other coding agents without model lock-in.

## Core Product Direction

- Spatial neural interface first
- Local-first persistence and resumability
- Multi-agent orchestration with adaptive routing
- Neuroplastic reinforcement and decay over time
- ADHD-first capture, continuation, and follow-through
- Git-backed continuity with local autosave

## Key Runtime Entry Points

- App shell: `src/components/layout/neural-core-app.tsx`
- Root page: `src/app/page.tsx`
- Neural scene: `src/components/brain/neural-scene.tsx`
- Close-zoom node view: `src/components/panels/node-consciousness.tsx`
- Minimal capture surface: `src/components/panels/neural-command-ribbon.tsx`

## Persistence and State

- Canonical app state: `data/state/core-state.json`
- Workspace profile: `data/state/workspace-profile.json`
- Thread history: `data/messages/threads/*.json`
- Task memory: `data/memory/task-memory.json`
- Notifications: `data/memory/notifications.json`
- Snapshots: `data/snapshots/*.json`

## Core Logic Modules

- Agent registry: `src/lib/agents/registry.ts`
- Neuroplastic engine: `src/lib/neuroplasticity/engine.ts`
- Adaptive signal generation: `src/lib/neural/signals.ts`
- Task routing: `src/lib/orchestration/task-router.ts`
- Reasoning traces: `src/lib/orchestration/reasoning.ts`
- Notification policy: `src/lib/notifications/engine.ts`
- Persistence normalization: `src/lib/persistence/core-store.ts`
- Whisper adapter: `src/lib/voice/whisper.ts`
- Git checkpointing: `src/lib/git/checkpoints.ts`
- Twilio hooks: `src/lib/integrations/twilio.ts`

## Development Workflow

1. Install dependencies: `npm install`
2. Run local dev server: `npm run dev`
3. Optional local Git autosave: `npm run autosave`
4. Verify with `npm run lint` and `npx next build --webpack`

## Agent Rules

- Treat persisted local data as potentially stale and rely on the normalization logic in `core-store.ts`
- Preserve local-first behavior; do not move core state to remote services
- Keep the neural field primary; avoid reintroducing dashboard-heavy chrome
- Prefer safe fallbacks over crashing on malformed local data
- Preserve Git-backed continuity and commit meaningful state/process changes

## Current Status

- Local Git repo exists on `main`
- Local autosave worker exists in `scripts/git-autosave.mjs`
- Repo is intended to be GitHub-tracked and agent-readable
