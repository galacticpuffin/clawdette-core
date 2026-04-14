# CLAUDE Context

## What This Repo Is

CLAWDETTE CORE is a local-first neural operating system and second-brain environment. The interface should feel like a calm pink neural field that becomes denser and more conscious as the user zooms into active nodes.

## What Matters Most

- The brain is the system, not decoration
- Local persistence is first-class
- The app must survive malformed or stale state
- The system is adaptive: reinforcement, decay, salience, habit loops, and learned routing all matter
- ADHD-style capture and continuity are core behavior, not peripheral features

## How the App Is Organized

- `src/app`: Next.js app router entry points and APIs
- `src/components/brain`: Three.js / WebGL neural rendering
- `src/components/layout`: top-level app composition
- `src/components/panels`: embedded interaction surfaces used only when needed
- `src/lib`: orchestration, memory, persistence, notifications, neuroplasticity, integrations
- `data/`: local-first runtime memory and snapshots

## Important Files to Read First

1. `src/components/layout/neural-core-app.tsx`
2. `src/components/brain/neural-scene.tsx`
3. `src/components/panels/node-consciousness.tsx`
4. `src/lib/neuroplasticity/engine.ts`
5. `src/lib/persistence/core-store.ts`
6. `src/lib/orchestration/task-router.ts`
7. `src/types/core.ts`

## Continuing Development

- Keep runtime safety high; never assume persisted state is well-formed
- Use the `/api/adapt` and `/api/capture` routes to evolve learning behavior
- If adding UI, make it conditional, spatial, and subordinate to the neural field
- If adding persistence fields, update normalization logic in `core-store.ts`
- If adding new behavior learning loops, update both `types/core.ts` and `neuroplasticity/engine.ts`

## Local Commands

```bash
npm install
npm run dev
npm run autosave
npm run lint
npx next build --webpack
```

## Git / Continuity

- Local autosave worker: `scripts/git-autosave.mjs`
- Manual checkpointing route: `/api/checkpoints`
- Runtime state and threads are intentionally stored in-repo for continuity across agent sessions
