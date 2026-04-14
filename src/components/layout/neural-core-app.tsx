"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { NeuralScene } from "@/components/brain/neural-scene";
import { AgentThreadPanel } from "@/components/panels/agent-thread-panel";
import { NeuralCommandRibbon } from "@/components/panels/neural-command-ribbon";
import { NodeConsciousness } from "@/components/panels/node-consciousness";
import { deriveSystemModeFromTasks } from "@/lib/notifications/engine";
import { initialCoreState, initialThreads } from "@/lib/memory/bootstrap";
import { nowIso, uid } from "@/lib/utils";
import type { AgentThread, CaptureResponse, CoreState, ThreadMessage, TranscriptionResult, ZoomLevel } from "@/types/core";

function formatLastSaved(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

export function NeuralCoreApp() {
  const [state, setState] = useState<CoreState>(initialCoreState());
  const [threads, setThreads] = useState<AgentThread[]>(initialThreads());
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(state.updatedAt);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const initialized = useRef(false);

  const activeAgent = useMemo(
    () => state.agents.find((agent) => agent.id === state.activeAgentId),
    [state.activeAgentId, state.agents],
  );
  const activeThread = useMemo(
    () => threads.find((thread) => thread.agentId === state.activeAgentId),
    [state.activeAgentId, threads],
  );
  const activeTask = useMemo(
    () => state.taskThreads.find((task) => task.id === state.activeTaskId) ?? state.taskThreads[0],
    [state.activeTaskId, state.taskThreads],
  );

  useEffect(() => {
    console.log("[CLAWDETTE] NeuralCoreApp mounted");
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
        const [stateResponse, threadResponse] = await Promise.all([
          fetch("/api/state", { cache: "no-store" }),
          fetch("/api/messages", { cache: "no-store" }),
        ]);

        if (stateResponse.ok) {
          const payload = (await stateResponse.json()) as CoreState;
          if (!payload?.neuroplasticity || !Array.isArray(payload?.agents) || !Array.isArray(payload?.taskThreads)) {
            console.error("[CLAWDETTE] invalid node payload", "state hydration missing required fields");
          } else {
            setState(payload);
            setLastSavedAt(payload.updatedAt);
            console.info("[CLAWDETTE] render ok");
          }
        }

        if (threadResponse.ok) {
          const payload = (await threadResponse.json()) as AgentThread[];
          setThreads(Array.isArray(payload) ? payload : initialThreads());
        }
      } catch (error) {
        console.error("[CLAWDETTE] persistence parse failed", error);
      }
    })();
  }, []);

  const persistState = useCallback(
    async (nextState: CoreState, reason: "interval" | "interaction" | "checkpoint" | "startup") => {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state: nextState, reason }),
      });

      if (!response.ok) return;

      const savedState = (await response.json()) as CoreState;
      setState(savedState);
      setLastSavedAt(savedState.updatedAt);
      setDirty(false);
    },
    [],
  );

  const saveState = useCallback(
    async (reason: "interval" | "interaction" | "checkpoint" | "startup") => {
      await persistState(state, reason);
    },
    [persistState, state],
  );

  useEffect(() => {
    if (!dirty) return;

    const id = window.setTimeout(() => {
      void saveState("interval");
    }, 6000);

    return () => window.clearTimeout(id);
  }, [dirty, saveState]);

  async function sendMessage(content: string) {
    if (!activeAgent) return;

    const userMessage: ThreadMessage = {
      id: uid("msg"),
      threadId: `thread_${activeAgent.id}`,
      author: "user",
      agentId: activeAgent.id,
      content,
      createdAt: nowIso(),
      state: "queued",
      linkedAgents: activeAgent.linkedAgents,
    };

    const agentMessage: ThreadMessage = {
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

    const nextThreadMessages = [userMessage, agentMessage];

    setThreads((current) =>
      current.map((thread) =>
        thread.agentId === activeAgent.id
          ? {
              ...thread,
              updatedAt: nowIso(),
              messages: [...thread.messages, ...nextThreadMessages],
            }
          : thread,
      ),
    );

    await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agentId: activeAgent.id, messages: nextThreadMessages }),
    });

    const nextState = {
      ...state,
      systemMode: "ACTIVE" as const,
    };
    setState(nextState);
    await persistState(nextState, "interaction");
    void adaptState({
      type: "message",
      taskId: state.activeTaskId,
      agentId: activeAgent.id,
      content,
      outcomeWeight: 0.62,
    });
  }

  async function captureVoice() {
    setVoiceBusy(true);

    try {
      const payload = await transcribeCapturedAudio();
      if (payload.text) {
        await sendMessage(`[Voice] ${payload.text}`);
      }
    } finally {
      setVoiceBusy(false);
    }
  }

  async function quickCapture(content: string, origin: "quick_capture" | "voice" = "quick_capture") {
    setCaptureBusy(true);

    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, origin }),
      });

      if (!response.ok) return;
      const payload = (await response.json()) as CaptureResponse;

      setState((current) => {
        const currentTask = current.taskThreads.find((task) => task.id === payload.task.id);
        const nextTasks = currentTask
          ? current.taskThreads.map((task) => (task.id === payload.task.id ? payload.task : task))
          : [payload.task, ...current.taskThreads];

        return {
          ...current,
          systemMode: payload.systemMode,
          activeTaskId: payload.task.id,
          activeAgentId: payload.task.assignedAgentIds[0] ?? current.activeAgentId,
          taskThreads: nextTasks,
          notifications: [...payload.notifications, ...current.notifications].slice(0, 12),
          memoryArtifacts: [
            {
              id: uid("memory"),
              layer: "task" as const,
              title: payload.task.title,
              summary: payload.task.summary,
              tags: payload.task.assignedAgentIds,
              createdAt: nowIso(),
              updatedAt: nowIso(),
            },
            ...current.memoryArtifacts,
          ].slice(0, 12),
        };
      });

      setThreads((current) =>
        current.map((thread) =>
          payload.task.assignedAgentIds.includes(thread.agentId) || thread.agentId === "assistant-dispatch"
            ? {
                ...thread,
                updatedAt: nowIso(),
                messages: [...thread.messages, ...payload.threadMessages.map((message) => ({
                  ...message,
                  id: uid("msg"),
                  threadId: thread.id,
                  agentId: thread.agentId,
                }))],
              }
            : thread,
        ),
      );
      setDirty(true);
      void adaptState({
        type: "capture",
        taskId: payload.task.id,
        agentId: payload.task.assignedAgentIds[0],
        content,
        emotionalWeight: payload.task.emotionalWeight,
        outcomeWeight: 0.84,
      });
    } finally {
      setCaptureBusy(false);
    }
  }

  async function createCheckpoint() {
    await saveState("checkpoint");
    await fetch("/api/checkpoints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `state checkpoint ${new Date().toLocaleString()}`,
      }),
    });
  }

  function setZoom(zoom: ZoomLevel) {
    setState((current) => ({ ...current, zoom, systemMode: deriveSystemModeFromTasks(current.taskThreads) }));
    setDirty(true);
  }

  function setActiveAgent(agentId: string) {
    setState((current) => ({ ...current, activeAgentId: agentId }));
    setDirty(true);
    void adaptState({
      type: "select_agent",
      agentId,
      taskId: state.activeTaskId,
      content: `select ${agentId}`,
      outcomeWeight: 0.54,
    });
  }

  function setActiveTask(taskId: string) {
    const task = state.taskThreads.find((item) => item.id === taskId);
    setState((current) => ({
      ...current,
      activeTaskId: taskId,
      activeAgentId: task?.assignedAgentIds[0] ?? current.activeAgentId,
    }));
    setDirty(true);
    void adaptState({
      type: "revisit_task",
      taskId,
      agentId: task?.assignedAgentIds[0],
      content: task?.title,
      emotionalWeight: task?.emotionalWeight,
      outcomeWeight: 0.74,
    });
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--bg)]">
      <div className="brain-grid absolute inset-0 opacity-50" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
      >
        <NeuralScene
          agents={state.agents}
          signals={state.signals}
          activeAgentId={state.activeAgentId}
          zoom={state.zoom}
          systemMode={state.systemMode}
          onSelect={setActiveAgent}
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,0,8,0.18)_42%,rgba(3,0,5,0.84)_100%)]" />

      {state.zoom === "close" ? (
        <NodeConsciousness
          agent={activeAgent}
          thread={activeThread}
          activeTask={activeTask}
          notifications={state.notifications}
          zoom={state.zoom}
          state={state}
        />
      ) : null}

      {state.zoom === "close" ? (
        <AgentThreadPanel
          activeAgent={activeAgent}
          thread={activeThread}
          onSend={sendMessage}
          onVoiceCapture={captureVoice}
          voiceBusy={voiceBusy}
        />
      ) : null}

      <NeuralCommandRibbon
        onCapture={(content) => quickCapture(content, "quick_capture")}
        onVoiceCapture={async () => {
          setVoiceBusy(true);
          try {
            const payload = await transcribeCapturedAudio();
            if (payload.text) {
              await quickCapture(payload.text, "voice");
            }
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

async function captureAudioBase64() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "placeholder-audio";
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  return new Promise<string>((resolve) => {
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";

      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }

      stream.getTracks().forEach((track) => track.stop());
      resolve(btoa(binary));
    };

    recorder.start();
    window.setTimeout(() => recorder.stop(), 2600);
  });
}

async function transcribeCapturedAudio() {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audioBase64: await captureAudioBase64(),
      storeAsMemory: true,
    }),
  });

  if (!response.ok) {
    return { text: "" } as TranscriptionResult;
  }

  return (await response.json()) as TranscriptionResult;
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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function handleWindowError(event: ErrorEvent) {
  console.error("[CLAWDETTE] Window runtime error", event.error ?? event.message);
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  console.error("[CLAWDETTE] Unhandled promise rejection", event.reason);
}
