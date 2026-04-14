import { agentRegistry } from "@/lib/agents/registry";
import { createInitialNeuroplasticState } from "@/lib/neuroplasticity/engine";
import { buildSignals } from "@/lib/neural/signals";
import { nowIso, uid } from "@/lib/utils";
import type { AgentThread, CoreState, MemoryArtifact, NotificationEvent, TaskThread } from "@/types/core";

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

export function initialTaskThreads(): TaskThread[] {
  const createdAt = nowIso();

  return [
    {
      id: uid("task"),
      title: "Onboard CLAWDETTE CORE as a real product brain",
      description:
        "Keep evolving the system into a local-first but product-grade neural operating system for nonlinear thinkers.",
      origin: "system",
      status: "active",
      urgency: "active",
      assignedAgentIds: ["assistant-dispatch", "chief-of-staff", "product", "engineering"],
      escalationChannels: ["in_app", "sms"],
      summary: "Core product thread is active and continuously resumable.",
      nextStep: "Expand orchestration, persistence, and external comms without collapsing back into dashboard habits.",
      createdAt,
      updatedAt: createdAt,
      salience: 0.88,
      revisitCount: 1,
      completionScore: 0.22,
      decay: 0.12,
      emotionalWeight: 0.78,
      themeTags: ["build", "research", "strategy"],
      lastTouchedAt: createdAt,
      reasoningTrace: {
        id: uid("reason"),
        leadAgentId: "chief-of-staff",
        supportingAgentIds: ["product", "engineering"],
        verdict: "This should be built as a product system with personal-first defaults and future multi-user seams.",
        consensusScore: 0.92,
        createdAt,
        sources: [
          {
            type: "global_knowledge",
            confidence: 0.9,
            summary: "Neural UIs can stay expressive while the system behind them remains product-grade and modular.",
          },
          {
            type: "local_memory",
            confidence: 0.91,
            summary: "Existing project memory already frames CLAWDETTE CORE as a persistent local-first intelligence system.",
          },
          {
            type: "behavioral_intent",
            confidence: 0.94,
            summary: "The user wants a second mind that catches dropped threads and continues when attention moves elsewhere.",
          },
        ],
      },
    },
  ];
}

export function initialNotifications(): NotificationEvent[] {
  return [
    {
      id: uid("notice"),
      title: "CLAWDETTE CORE online",
      body: "Local-first neural OS initialized with memory, agents, and resumable task continuity.",
      urgency: "summary",
      channels: ["in_app", "email"],
      status: "stored",
      createdAt: nowIso(),
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
  const neuroplasticity = createInitialNeuroplasticState();
  const state: CoreState = {
    version: 1,
    systemName: "CLAWDETTE CORE",
    updatedAt: nowIso(),
    zoom: "far",
    systemMode: "ACTIVE",
    activeAgentId: "assistant-dispatch",
    activeTaskId: undefined,
    workspace: {
      id: "workspace_clawdette_core",
      label: "Private Neural Brain",
      mode: "personal",
      ownerId: "kayla",
    },
    activeUser: {
      id: "kayla",
      displayName: "Kayla",
      archetype: "adhd_founder",
    },
    agents: agentRegistry,
    signals: [],
    memoryArtifacts: initialMemoryArtifacts(),
    taskThreads: initialTaskThreads(),
    notifications: initialNotifications(),
    neuroplasticity,
  };

  state.signals = buildSignals(state);
  return state;
}
