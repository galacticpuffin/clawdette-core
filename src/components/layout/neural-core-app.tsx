"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { NeuralScene } from "@/components/brain/neural-scene";
import { AgentThreadPanel } from "@/components/panels/agent-thread-panel";
import { NeuralCommandRibbon } from "@/components/panels/neural-command-ribbon";
import { NodeConsciousness } from "@/components/panels/node-consciousness";
import { deriveSystemModeFromTasks } from "@/lib/notifications/engine";
import { initialCoreState, initialThreads } from "@/lib/memory/bootstrap";
import { nowIso, uid } from "@/lib/utils";
import type {
  AgentThread,
  CaptureResponse,
  CoreState,
  ThreadMessage,
  TranscriptionResult,
  ZoomLevel,
} from "@/types/core";

// ── Overlay: node labels that fade in as camera approaches ───────────────────

function NodeLabel({
  name,
  title,
  region,
  active,
  cameraDistance,
}: {
  name: string;
  title: string;
  region: string;
  active: boolean;
  cameraDistance: number;
}) {
  // Labels appear between d=4.8 (faint) and d=3.5 (full)
  const opacity = Math.max(0, Math.min(1, (4.8 - cameraDistance) / 1.3));
  if (opacity <= 0) return null;

  return (
    <div
      style={{ opacity, transition: "opacity 0.4s ease" }}
      className={`pointer-events-none select-none text-center ${active ? "text-pink-100" : "text-pink-100/50"}`}
    >
      <div className="text-[9px] uppercase tracking-[0.4em]">{name}</div>
      {cameraDistance < 3.8 && (
        <div className="mt-0.5 text-[8px] text-pink-100/36">{title}</div>
      )}
    </div>
  );
}

// ── Region cluster names that appear at mid zoom ─────────────────────────────

const REGION_LABELS: Record<string, { label: string; pos: [number, number] }> = {
  executive:   { label: "EXECUTIVE",   pos: [50, 14] },
  strategy:    { label: "STRATEGY",    pos: [64, 22] },
  engineering: { label: "ENGINEERING", pos: [74, 44] },
  creative:    { label: "CREATIVE",    pos: [72, 62] },
  memory:      { label: "MEMORY",      pos: [26, 38] },
  dispatch:    { label: "DISPATCH",    pos: [52, 52] },
  operations:  { label: "OPERATIONS",  pos: [22, 50] },
  security:    { label: "SECURITY",    pos: [56, 72] },
  monitor:     { label: "MONITOR",     pos: [44, 76] },
  life:        { label: "LIFE ADMIN",  pos: [20, 32] },
};

function RegionLabels({ cameraDistance }: { cameraDistance: number }) {
  // Visible between d=6.5 (faint) and d=4.4 (full), fade out below d=4.0
  const opacity = Math.max(0, Math.min(0.22, ((cameraDistance - 4.0) / 2.5) * 0.22));
  if (opacity <= 0.005) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ opacity }}>
      {Object.entries(REGION_LABELS).map(([key, { label, pos }]) => (
        <div
          key={key}
          className="absolute select-none text-[9px] uppercase tracking-[0.5em] text-pink-100/70"
          style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, transform: "translate(-50%, -50%)" }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────

export function NeuralCoreApp() {
  const [state, setState] = useState<CoreState>(initialCoreState());
  const [threads, setThreads] = useState<AgentThread[]>(initialThreads());
  const [cameraDistance, setCameraDistance] = useState(6.5);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialized = useRef(false);

  // Derived from camera distance (continuous)
  const zoom: ZoomLevel = cameraDistance < 3.4 ? "close" : cameraDistance < 5.6 ? "mid" : "far";

  const activeAgent = state.agents.find((a) => a.id === state.activeAgentId);
  const activeThread = threads.find((t) => t.agentId === state.activeAgentId);
  const activeTask = state.taskThreads.find((t) => t.id === state.activeTaskId) ?? state.taskThreads[0];

  // ── Boot hydration ──────────────────────────────────────────────────────────

  useEffect(() => {
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void (async () => {
      try {
        const [stateRes, threadRes] = await Promise.all([
          fetch("/api/state", { cache: "no-store" }),
          fetch("/api/messages", { cache: "no-store" }),
        ]);
        if (stateRes.ok) {
          const payload = (await stateRes.json()) as CoreState;
          if (payload?.neuroplasticity && Array.isArray(payload?.agents) && Array.isArray(payload?.taskThreads)) {
            setState(payload);
          }
        }
        if (threadRes.ok) {
          const payload = (await threadRes.json()) as AgentThread[];
          setThreads(Array.isArray(payload) ? payload : initialThreads());
        }
      } catch (error) {
        console.error("[CLAWDETTE] hydration failed", error);
      }
    })();
  }, []);

  // ── Auto-save on dirty ──────────────────────────────────────────────────────

  const persistState = useCallback(async (nextState: CoreState, reason: "interval" | "interaction" | "checkpoint" | "startup") => {
    const res = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: nextState, reason }),
    });
    if (!res.ok) return;
    const saved = (await res.json()) as CoreState;
    setState(saved);
    setDirty(false);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const id = window.setTimeout(() => void persistState(state, "interval"), 6000);
    return () => window.clearTimeout(id);
  }, [dirty, persistState, state]);

  // ── Messaging ───────────────────────────────────────────────────────────────

  async function sendMessage(content: string) {
    if (!activeAgent) return;
    const userMsg: ThreadMessage = {
      id: uid("msg"),
      threadId: `thread_${activeAgent.id}`,
      author: "user",
      agentId: activeAgent.id,
      content,
      createdAt: nowIso(),
      state: "queued",
      linkedAgents: activeAgent.linkedAgents,
    };
    const agentMsg: ThreadMessage = {
      id: uid("msg"),
      threadId: `thread_${activeAgent.id}`,
      author: "agent",
      agentId: activeAgent.id,
      content: `${activeAgent.name} accepted directive and opened an execution lane.`,
      createdAt: nowIso(),
      state: activeAgent.status,
      linkedAgents: activeAgent.linkedAgents,
      output: "Thread stored locally. Route can later bind to real orchestration workers.",
    };
    setThreads((cur) =>
      cur.map((t) =>
        t.agentId === activeAgent.id
          ? { ...t, updatedAt: nowIso(), messages: [...t.messages, userMsg, agentMsg] }
          : t,
      ),
    );
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: activeAgent.id, messages: [userMsg, agentMsg] }),
    });
    const nextState = { ...state, systemMode: "ACTIVE" as const };
    setState(nextState);
    await persistState(nextState, "interaction");
    void adaptState({ type: "message", taskId: state.activeTaskId, agentId: activeAgent.id, content, outcomeWeight: 0.62 });
  }

  // ── Quick capture ────────────────────────────────────────────────────────────

  async function quickCapture(content: string, origin: "quick_capture" | "voice" = "quick_capture") {
    setCaptureBusy(true);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, origin }),
      });
      if (!res.ok) return;
      const payload = (await res.json()) as CaptureResponse;
      setState((cur) => {
        const exists = cur.taskThreads.find((t) => t.id === payload.task.id);
        return {
          ...cur,
          systemMode: payload.systemMode,
          activeTaskId: payload.task.id,
          activeAgentId: payload.task.assignedAgentIds[0] ?? cur.activeAgentId,
          taskThreads: exists
            ? cur.taskThreads.map((t) => (t.id === payload.task.id ? payload.task : t))
            : [payload.task, ...cur.taskThreads],
          notifications: [...payload.notifications, ...cur.notifications].slice(0, 12),
          memoryArtifacts: [
            { id: uid("memory"), layer: "task" as const, title: payload.task.title, summary: payload.task.summary, tags: payload.task.assignedAgentIds, createdAt: nowIso(), updatedAt: nowIso() },
            ...cur.memoryArtifacts,
          ].slice(0, 12),
        };
      });
      setThreads((cur) =>
        cur.map((t) =>
          payload.task.assignedAgentIds.includes(t.agentId) || t.agentId === "assistant-dispatch"
            ? { ...t, updatedAt: nowIso(), messages: [...t.messages, ...payload.threadMessages.map((m) => ({ ...m, id: uid("msg"), threadId: t.id, agentId: t.agentId }))] }
            : t,
        ),
      );
      setDirty(true);
      void adaptState({ type: "capture", taskId: payload.task.id, agentId: payload.task.assignedAgentIds[0], content, emotionalWeight: payload.task.emotionalWeight, outcomeWeight: 0.84 });
    } finally {
      setCaptureBusy(false);
    }
  }

  function setActiveAgent(agentId: string) {
    setState((cur) => ({ ...cur, activeAgentId: agentId }));
    setDirty(true);
    void adaptState({ type: "select_agent", agentId, taskId: state.activeTaskId, content: `select ${agentId}`, outcomeWeight: 0.54 });
  }

  // ── Derived system mode from zoom ───────────────────────────────────────────

  useEffect(() => {
    setState((cur) => ({ ...cur, systemMode: deriveSystemModeFromTasks(cur.taskThreads) }));
  }, [zoom]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="relative h-screen w-screen overflow-hidden" style={{ background: "radial-gradient(ellipse at center, #0a0014 0%, #000000 100%)" }}>

      {/* Full-screen 3D brain — the interface IS this */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }} className="absolute inset-0">
        <NeuralScene
          agents={state.agents}
          signals={state.signals}
          activeAgentId={state.activeAgentId}
          zoom={zoom}
          systemMode={state.systemMode}
          onSelect={setActiveAgent}
          onZoomChange={(level) => setState((cur) => ({ ...cur, zoom: level }))}
          onCameraDistance={setCameraDistance}
        />
      </motion.div>

      {/* Edge vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,4,0.45)_75%,rgba(0,0,8,0.88)_100%)]" />

      {/* Region labels — fade in at mid zoom, fade out at close */}
      <RegionLabels cameraDistance={cameraDistance} />

      {/* DEEP ZOOM: node consciousness overlay (no dashboard panels) */}
      <AnimatePresence>
        {zoom === "close" ? (
          <motion.div
            key="consciousness"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <NodeConsciousness
              agent={activeAgent}
              thread={activeThread}
              activeTask={activeTask}
              notifications={state.notifications}
              zoom={zoom}
              state={state}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* DEEP ZOOM: agent thread panel — slides in from right */}
      <AnimatePresence>
        {zoom === "close" ? (
          <motion.div
            key="thread-panel"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <AgentThreadPanel
              activeAgent={activeAgent}
              thread={activeThread}
              onSend={sendMessage}
              onVoiceCapture={async () => {
                setVoiceBusy(true);
                try {
                  const payload = await transcribeCapturedAudio();
                  if (payload.text) await sendMessage(`[Voice] ${payload.text}`);
                } finally {
                  setVoiceBusy(false);
                }
              }}
              voiceBusy={voiceBusy}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* PERSISTENT: bottom capture bar — the only always-visible UI */}
      <NeuralCommandRibbon
        onCapture={(content) => quickCapture(content, "quick_capture")}
        onVoiceCapture={async () => {
          setVoiceBusy(true);
          try {
            const payload = await transcribeCapturedAudio();
            if (payload.text) await quickCapture(payload.text, "voice");
          } finally {
            setVoiceBusy(false);
          }
        }}
        busy={captureBusy}
        voiceBusy={voiceBusy}
      />
    </main>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function captureAudioBase64(): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "placeholder-audio";
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return new Promise<string>((resolve) => {
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      stream.getTracks().forEach((t) => t.stop());
      resolve(btoa(binary));
    };
    recorder.start();
    window.setTimeout(() => recorder.stop(), 2600);
  });
}

async function transcribeCapturedAudio(): Promise<TranscriptionResult> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: await captureAudioBase64(), storeAsMemory: true }),
  });
  if (!res.ok) return { text: "" };
  return (await res.json()) as TranscriptionResult;
}

async function adaptState(payload: {
  type: "capture" | "revisit_task" | "select_agent" | "message";
  taskId?: string;
  agentId?: string;
  content?: string;
  emotionalWeight?: number;
  outcomeWeight?: number;
}) {
  await fetch("/api/adapt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function handleWindowError(event: ErrorEvent) {
  console.error("[CLAWDETTE] runtime error", event.error ?? event.message);
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  console.error("[CLAWDETTE] unhandled rejection", event.reason);
}
