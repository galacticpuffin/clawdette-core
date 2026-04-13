"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { NeuralScene } from "@/components/brain/neural-scene";
import { AgentThreadPanel } from "@/components/panels/agent-thread-panel";
import { BrainHud } from "@/components/panels/brain-hud";
import { NeuralSidebar } from "@/components/panels/neural-sidebar";
import { initialCoreState, initialThreads } from "@/lib/memory/bootstrap";
import { nowIso, uid } from "@/lib/utils";
import type { AgentThread, CoreState, ThreadMessage, TranscriptionResult, ZoomLevel } from "@/types/core";

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
  const initialized = useRef(false);

  const activeAgent = useMemo(
    () => state.agents.find((agent) => agent.id === state.activeAgentId),
    [state.activeAgentId, state.agents],
  );
  const activeThread = useMemo(
    () => threads.find((thread) => thread.agentId === state.activeAgentId),
    [state.activeAgentId, threads],
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void (async () => {
      const [stateResponse, threadResponse] = await Promise.all([
        fetch("/api/state", { cache: "no-store" }),
        fetch("/api/messages", { cache: "no-store" }),
      ]);

      if (stateResponse.ok) {
        const payload = (await stateResponse.json()) as CoreState;
        setState(payload);
        setLastSavedAt(payload.updatedAt);
      }

      if (threadResponse.ok) {
        const payload = (await threadResponse.json()) as AgentThread[];
        setThreads(payload);
      }
    })();
  }, []);

  const saveState = useCallback(async (reason: "interval" | "interaction" | "checkpoint" | "startup") => {
    const response = await fetch("/api/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state, reason }),
    });

    if (!response.ok) return;

    const nextState = (await response.json()) as CoreState;
    setState(nextState);
    setLastSavedAt(nextState.updatedAt);
    setDirty(false);
  }, [state]);

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

    await saveState("interaction");
  }

  async function captureVoice() {
    setVoiceBusy(true);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioBase64: "placeholder-audio",
          storeAsMemory: true,
        }),
      });

      if (!response.ok) return;

      const payload = (await response.json()) as TranscriptionResult;
      if (payload.text) {
        await sendMessage(`[Voice] ${payload.text}`);
      }
    } finally {
      setVoiceBusy(false);
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
    setState((current) => ({ ...current, zoom }));
    setDirty(true);
  }

  function setActiveAgent(agentId: string) {
    setState((current) => ({ ...current, activeAgentId: agentId }));
    setDirty(true);
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--bg)]">
      <div className="brain-grid absolute inset-0 opacity-70" />

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
          onSelect={setActiveAgent}
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,0,8,0.18)_42%,rgba(3,0,5,0.84)_100%)]" />

      <NeuralSidebar
        agents={state.agents}
        memoryArtifacts={state.memoryArtifacts}
        activeAgentId={state.activeAgentId}
        onSelectAgent={setActiveAgent}
      />

      <AgentThreadPanel
        activeAgent={activeAgent}
        thread={activeThread}
        onSend={sendMessage}
        onVoiceCapture={captureVoice}
        voiceBusy={voiceBusy}
      />

      <BrainHud
        state={state}
        activeAgent={activeAgent}
        dirty={dirty}
        lastSavedLabel={formatLastSaved(lastSavedAt)}
        onZoomChange={setZoom}
        onCheckpoint={createCheckpoint}
      />
    </main>
  );
}
