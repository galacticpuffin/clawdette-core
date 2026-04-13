import { agentRegistry } from "@/lib/agents/registry";
import { buildSignals } from "@/lib/neural/signals";
import { nowIso, uid } from "@/lib/utils";
import type { AgentThread, CoreState, MemoryArtifact } from "@/types/core";

export function initialMemoryArtifacts(): MemoryArtifact[] {
  const timestamp = nowIso();

  return [
    {
      id: uid("memory"),
      layer: "executive",
      title: "Executive Orientation",
      summary:
        "CLAWDETTE CORE is operating as a local-first executive neural system with live orchestration lanes and resumable state.",
      tags: ["identity", "executive", "continuity"],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: uid("memory"),
      layer: "project",
      title: "Project Charter",
      summary:
        "The interface is the brain itself. Messaging, voice, tools, and memory all live inside the neural substrate.",
      tags: ["project", "brain-ui", "architecture"],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: uid("memory"),
      layer: "continuation",
      title: "Future Agent Continuation",
      summary:
        "Continue from local filesystem state, recent snapshots, and thread histories before making orchestration changes.",
      tags: ["continuation", "resume", "agents"],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export function initialThreads(): AgentThread[] {
  const timestamp = nowIso();

  return agentRegistry.map((agent) => ({
    id: `thread_${agent.id}`,
    agentId: agent.id,
    title: `${agent.name} Thread`,
    updatedAt: timestamp,
    messages: [
      {
        id: uid("msg"),
        threadId: `thread_${agent.id}`,
        author: "agent",
        agentId: agent.id,
        createdAt: timestamp,
        state: agent.status,
        linkedAgents: agent.linkedAgents,
        content: `${agent.name} online. ${agent.mission}`,
        output: "Ready for directive routing.",
      },
    ],
  }));
}

export function initialCoreState(): CoreState {
  return {
    version: 1,
    systemName: "CLAWDETTE CORE",
    updatedAt: nowIso(),
    zoom: "far",
    activeAgentId: "assistant-dispatch",
    ambientMode: "operating",
    agents: agentRegistry,
    signals: buildSignals(),
    memoryArtifacts: initialMemoryArtifacts(),
  };
}
