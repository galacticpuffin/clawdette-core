# CLAWDETTE CORE Architecture

## 1. Architecture

CLAWDETTE CORE is split into five layers:

1. Neural Interface Layer
   - immersive brain renderer
   - zoom-state orchestration
   - embedded agent inspection and messaging
2. Orchestration Layer
   - agent registry
   - routing rules
   - signal and task state
3. Persistence Layer
   - filesystem-backed JSON stores
   - autosave snapshots
   - resumable session summaries
4. Integration Layer
   - whisper-compatible transcription adapter
   - git checkpoint service
   - future Twilio and local tool connectors
5. Continuity Layer
   - local checkpoint metadata
   - git-backed history
   - agent-readable summaries for future continuation

## 2. Directory Structure

```text
clawdette-core/
├── data/
│   ├── checkpoints/
│   ├── memory/
│   ├── messages/threads/
│   ├── snapshots/
│   └── state/
├── docs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   └── ...
│   ├── components/
│   │   ├── brain/
│   │   ├── layout/
│   │   └── panels/
│   ├── lib/
│   │   ├── agents/
│   │   ├── git/
│   │   ├── neural/
│   │   ├── persistence/
│   │   ├── voice/
│   │   └── ...
│   └── types/
└── ...
```

## 3. Core Visual Engine Plan

- `@react-three/fiber` drives the living neural organism
- procedural regions create a pink synthetic brain silhouette
- zoom controls switch semantic density from regions to clusters to node detail
- signal pulses travel between regions based on synthetic task traffic
- glass overlays stay subordinate to the brain rather than replacing it

## 4. Neural Rendering System

- region anchors define executive territories
- cluster and node data are projected into the scene
- animated ribbons and particles represent agent traffic
- atmospheric bloom-like gradients are handled in CSS and additive mesh materials
- close zoom reveals inspectable node halos and thread state

## 5. Agent Model

Each agent contains:

- identity and region
- mission and authority
- linked tools
- permissions by capability
- current load
- task queue summary
- thread history reference
- health and activity signal

## 6. Memory Model

Memory is split into durable files:

- `executive-memory.json`
- `session-memory.json`
- `project-memory.json`
- `life-admin-memory.json`
- `task-memory.json`
- `continuation-summary.json`
- `core-state.json`

## 7. Autosave and Git Checkpoint Strategy

- client autosaves active state every 6 seconds when dirty
- meaningful mutations trigger immediate save
- server writes state snapshots to `data/snapshots`
- checkpoint endpoint can stage and commit state changes with a generated summary
- checkpoint metadata is mirrored to JSON for recovery if git commit fails

## 8. Voice / Transcription Integration Layer

- browser media capture records voice locally
- upload route forwards audio to a Whisper-compatible endpoint
- transcript is optionally stored as a memory artifact
- future routing can map transcript intent into agent dispatch and Twilio alerts

## 9. Messaging System

- each executive node owns a thread
- messages are local-first JSON records
- thread panel is embedded into the neural viewport
- messages carry state, linked agents, and output references

## 10. First-Pass Implementation Files

The first pass establishes:

- app shell and visual system
- agent registry and neural topology
- local persistence APIs
- autosave client logic
- message thread APIs
- whisper-compatible transcription endpoint
- git checkpoint service
