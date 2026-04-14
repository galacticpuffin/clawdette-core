import { agentRegistry } from "@/lib/agents/registry";
import { nowIso, uid } from "@/lib/utils";
import type {
  AdaptationRequest,
  BehavioralPattern,
  CoreState,
  MemoryCluster,
  NeuroplasticState,
  PathwayStrength,
  TaskThread,
} from "@/types/core";

const basePathways: Array<[string, string, string, number, string[]]> = [
  ["ceo", "chief-of-staff", "directive", 0.84, ["leadership", "execution"]],
  ["chief-of-staff", "assistant-dispatch", "routing", 0.82, ["routing", "coordination"]],
  ["assistant-dispatch", "automation", "workflow", 0.74, ["workflow", "delegation"]],
  ["automation", "engineering", "execution", 0.78, ["build", "execution"]],
  ["memory", "ceo", "continuity", 0.64, ["memory", "executive"]],
  ["voice-comms", "assistant-dispatch", "transcript", 0.68, ["voice", "capture"]],
  ["research", "strategy", "evidence", 0.66, ["research", "strategy"]],
  ["product", "engineering", "build lane", 0.72, ["product", "build"]],
  ["coo", "operations", "execution pull", 0.73, ["operations", "follow-through"]],
];

export function createInitialNeuroplasticState(): NeuroplasticState {
  const timestamp = nowIso();

  return {
    pathways: basePathways.map(([from, to, label, weight, themeTags]) => ({
      id: uid("path"),
      from,
      to,
      label,
      weight,
      salience: weight,
      activations: 1,
      successfulActivations: 0,
      lastActivatedAt: timestamp,
      decay: 0.08,
      themeTags,
    })),
    memoryClusters: [
      {
        id: uid("cluster"),
        label: "Build Cortex",
        theme: "build",
        strength: 0.72,
        salience: 0.76,
        taskIds: [],
        memoryIds: [],
        lastConsolidatedAt: timestamp,
      },
      {
        id: uid("cluster"),
        label: "Research Halo",
        theme: "research",
        strength: 0.68,
        salience: 0.72,
        taskIds: [],
        memoryIds: [],
        lastConsolidatedAt: timestamp,
      },
    ],
    behavioralPatterns: [],
    cognitiveProfile: {
      attentionStyle: "nonlinear",
      distractibilityIndex: 0.62,
      taskSwitchIntensity: 0.66,
      revisitReliance: 0.7,
      urgencySensitivity: 0.58,
      preferredUpdateMode: "digest",
      overfocusThemes: ["build", "strategy"],
      avoidanceThemes: [],
    },
    workingMemoryTaskIds: [],
    longTermMemoryTaskIds: [],
    adaptationLog: [],
  };
}

export function inferThemeTags(content: string) {
  const text = content.toLowerCase();
  const tags = new Set<string>();
  const vocab: Array<[string, string[]]> = [
    ["research", ["research", "look into", "investigate", "later", "idea", "market"]],
    ["build", ["build", "ship", "prototype", "product", "launch", "feature"]],
    ["memory", ["remember", "forget", "note", "save", "recall"]],
    ["money", ["budget", "pricing", "revenue", "money", "finance"]],
    ["security", ["security", "breach", "attack", "password", "risk"]],
    ["life_admin", ["schedule", "remind", "calendar", "house", "personal"]],
    ["communication", ["email", "text", "call", "message", "notify"]],
    ["stress", ["urgent", "asap", "stressed", "panic", "emergency"]],
  ];

  for (const [tag, terms] of vocab) {
    if (terms.some((term) => text.includes(term))) {
      tags.add(tag);
    }
  }

  if (tags.size === 0) {
    tags.add("general");
  }

  return Array.from(tags);
}

export function applyAdaptationEvent(state: CoreState, request: AdaptationRequest): CoreState {
  const timestamp = nowIso();
  const themeTags = inferThemeTags(request.content ?? "");
  const event = {
    id: uid("adapt"),
    type: request.type,
    createdAt: timestamp,
    taskId: request.taskId,
    agentId: request.agentId,
    pathwayKey: undefined,
    themeTags,
    emotionalWeight: request.emotionalWeight ?? inferEmotionalWeight(request.content ?? "", request.type),
    outcomeWeight: request.outcomeWeight ?? inferOutcomeWeight(request.type),
    summary: summarizeEvent(request.type, request.content, themeTags),
  };

  const decayedTasks = state.taskThreads.map((task) => decayTask(task, timestamp));
  const decayedPathways = (state.neuroplasticity?.pathways ?? []).map((pathway) => decayPathway(pathway, timestamp));

  const targetedTaskIds = request.taskId ? [request.taskId] : state.activeTaskId ? [state.activeTaskId] : [];
  const taskThreads = decayedTasks.map((task) =>
    targetedTaskIds.includes(task.id) || intersects(task.themeTags, themeTags)
      ? reinforceTask(task, event)
      : task,
  );

  const np = state.neuroplasticity ?? createInitialNeuroplasticState();
  const neuroplasticity: NeuroplasticState = {
    ...np,
    pathways: reinforcePathways(decayedPathways, request, state, themeTags, event.outcomeWeight),
    memoryClusters: updateMemoryClusters(np.memoryClusters, taskThreads, themeTags, timestamp),
    behavioralPatterns: updateBehavioralPatterns(np.behavioralPatterns, themeTags, event, timestamp),
    cognitiveProfile: updateCognitiveProfile(np.cognitiveProfile, request, themeTags),
    workingMemoryTaskIds: taskThreads
      .filter((task) => task.salience >= 0.58 && !task.dormant)
      .sort((a, b) => b.salience - a.salience)
      .slice(0, 6)
      .map((task) => task.id),
    longTermMemoryTaskIds: taskThreads
      .filter((task) => task.revisitCount >= 2 || task.completionScore >= 0.72)
      .slice(0, 12)
      .map((task) => task.id),
    adaptationLog: [event, ...(np.adaptationLog)].slice(0, 64),
  };

  const agents = state.agents.map((agent) => {
    const relevant = (neuroplasticity?.pathways ?? []).filter((pathway) => pathway.from === agent.id || pathway.to === agent.id);
    const averageWeight =
      relevant.length > 0 ? relevant.reduce((sum, pathway) => sum + pathway.weight, 0) / relevant.length : agent.signal;

    return {
      ...agent,
      signal: clampNumber((agent.signal + averageWeight) / 2, 0.2, 1),
    };
  });

  return {
    ...state,
    updatedAt: timestamp,
    agents,
    taskThreads,
    neuroplasticity,
  };
}

export function buildAdaptiveSignals(state: CoreState) {
  return (state.neuroplasticity?.pathways ?? [])
    .filter((pathway) => pathway.weight > 0.12)
    .sort((a, b) => b.weight + b.salience - (a.weight + a.salience))
    .slice(0, 18)
    .map((pathway) => ({
      id: uid("signal"),
      from: pathway.from,
      to: pathway.to,
      label: pathway.label,
      intensity: clampNumber((pathway.weight + pathway.salience) / 2, 0.15, 1),
      weight: pathway.weight,
      decay: pathway.decay,
      themeTags: pathway.themeTags,
    }));
}

function reinforceTask(task: TaskThread, event: NeuroplasticState["adaptationLog"][number]): TaskThread {
  const salienceBoost = event.outcomeWeight * 0.12 + event.emotionalWeight * 0.1;
  const revisitBoost = event.type === "revisit_task" || event.type === "capture" ? 1 : 0;
  const completionBoost = event.type === "complete_task" ? 0.18 : 0;
  const nextSalience = clampNumber(task.salience + salienceBoost - task.decay * 0.08, 0.05, 1);

  return {
    ...task,
    salience: nextSalience,
    revisitCount: task.revisitCount + revisitBoost,
    completionScore: clampNumber(task.completionScore + completionBoost, 0, 1),
    emotionalWeight: clampNumber((task.emotionalWeight + event.emotionalWeight) / 2, 0, 1),
    decay: clampNumber(task.decay - 0.04 * event.outcomeWeight, 0.02, 0.94),
    themeTags: Array.from(new Set([...task.themeTags, ...event.themeTags])),
    dormant: nextSalience < 0.22,
    lastTouchedAt: event.createdAt,
    updatedAt: event.createdAt,
  };
}

function decayTask(task: TaskThread, timestamp: string): TaskThread {
  const hoursIdle = hoursBetween(task.lastTouchedAt || task.updatedAt, timestamp);
  const decayDelta = Math.min(0.22, hoursIdle * 0.01);
  const nextSalience = clampNumber(task.salience - decayDelta * (0.3 + task.decay), 0.04, 1);

  return {
    ...task,
    salience: nextSalience,
    dormant: nextSalience < 0.18,
    decay: clampNumber(task.decay + decayDelta * 0.35, 0.02, 0.98),
  };
}

function decayPathway(pathway: PathwayStrength, timestamp: string): PathwayStrength {
  const idleHours = hoursBetween(pathway.lastActivatedAt, timestamp);
  const drift = Math.min(0.18, idleHours * 0.008);

  return {
    ...pathway,
    weight: clampNumber(pathway.weight - drift * (0.22 + pathway.decay), 0.05, 1),
    salience: clampNumber(pathway.salience - drift * 0.3, 0.05, 1),
    decay: clampNumber(pathway.decay + drift * 0.18, 0.03, 0.98),
  };
}

function reinforcePathways(
  pathways: PathwayStrength[],
  request: AdaptationRequest,
  state: CoreState,
  themeTags: string[],
  outcomeWeight: number,
) {
  const targetAgents = new Set<string>();

  if (request.agentId) targetAgents.add(request.agentId);
  if (request.taskId) {
    const task = state.taskThreads.find((item) => item.id === request.taskId);
    task?.assignedAgentIds.forEach((agentId) => targetAgents.add(agentId));
  }
  if (!request.agentId && !request.taskId) {
    const activeTask = state.taskThreads.find((item) => item.id === state.activeTaskId);
    activeTask?.assignedAgentIds.forEach((agentId) => targetAgents.add(agentId));
  }

  const activeAgents = Array.from(targetAgents);
  const next = [...pathways];

  for (let index = 0; index < activeAgents.length - 1; index += 1) {
    const from = activeAgents[index];
    const to = activeAgents[index + 1];
    const existing = next.find((pathway) => pathway.from === from && pathway.to === to);

    if (existing) {
      existing.weight = clampNumber(existing.weight + 0.08 * outcomeWeight, 0.05, 1);
      existing.salience = clampNumber(existing.salience + 0.06 + themeTags.length * 0.01, 0.05, 1);
      existing.activations += 1;
      existing.successfulActivations += request.type === "complete_task" ? 1 : 0;
      existing.lastActivatedAt = nowIso();
      existing.decay = clampNumber(existing.decay - 0.05 * outcomeWeight, 0.02, 0.98);
      existing.themeTags = Array.from(new Set([...existing.themeTags, ...themeTags]));
    } else {
      next.push({
        id: uid("path"),
        from,
        to,
        label: `${themeTags[0] ?? "adaptive"} lane`,
        weight: clampNumber(0.32 + outcomeWeight * 0.12, 0.1, 1),
        salience: clampNumber(0.4 + themeTags.length * 0.05, 0.1, 1),
        activations: 1,
        successfulActivations: request.type === "complete_task" ? 1 : 0,
        lastActivatedAt: nowIso(),
        decay: 0.12,
        themeTags,
      });
    }
  }

  return next;
}

function updateMemoryClusters(
  clusters: MemoryCluster[],
  tasks: TaskThread[],
  themeTags: string[],
  timestamp: string,
) {
  const next = [...clusters];

  for (const tag of themeTags) {
    const matchingTasks = tasks.filter((task) => task.themeTags.includes(tag));
    const existing = next.find((cluster) => cluster.theme === tag);

    if (existing) {
      existing.strength = clampNumber(existing.strength + matchingTasks.length * 0.02, 0.08, 1);
      existing.salience = clampNumber(existing.salience + 0.05, 0.08, 1);
      existing.taskIds = Array.from(new Set([...existing.taskIds, ...matchingTasks.slice(0, 8).map((task) => task.id)]));
      existing.lastConsolidatedAt = timestamp;
    } else {
      next.push({
        id: uid("cluster"),
        label: `${toLabel(tag)} Cluster`,
        theme: tag,
        strength: 0.34,
        salience: 0.38,
        taskIds: matchingTasks.slice(0, 8).map((task) => task.id),
        memoryIds: [],
        lastConsolidatedAt: timestamp,
      });
    }
  }

  return next
    .map((cluster) => ({
      ...cluster,
      salience: clampNumber(cluster.salience - Math.min(0.12, hoursBetween(cluster.lastConsolidatedAt, timestamp) * 0.004), 0.05, 1),
    }))
    .sort((a, b) => b.salience - a.salience)
    .slice(0, 16);
}

function updateBehavioralPatterns(
  patterns: BehavioralPattern[],
  themeTags: string[],
  event: NeuroplasticState["adaptationLog"][number],
  timestamp: string,
) {
  const next = [...patterns];

  for (const tag of themeTags) {
    const existing = next.find((pattern) => pattern.theme === tag);
    if (existing) {
      existing.count += 1;
      existing.momentum = clampNumber(existing.momentum + 0.06 * event.outcomeWeight, 0.05, 1);
      existing.emotionalWeight = clampNumber((existing.emotionalWeight + event.emotionalWeight) / 2, 0, 1);
      existing.lastSeenAt = timestamp;
    } else {
      next.push({
        id: uid("pattern"),
        theme: tag,
        count: 1,
        momentum: 0.36,
        emotionalWeight: event.emotionalWeight,
        lastSeenAt: timestamp,
      });
    }
  }

  return next
    .map((pattern) => ({
      ...pattern,
      momentum: clampNumber(pattern.momentum - Math.min(0.09, hoursBetween(pattern.lastSeenAt, timestamp) * 0.003), 0.03, 1),
    }))
    .sort((a, b) => b.momentum + b.count * 0.02 - (a.momentum + a.count * 0.02))
    .slice(0, 20);
}

function updateCognitiveProfile(
  profile: NeuroplasticState["cognitiveProfile"],
  request: AdaptationRequest,
  themeTags: string[],
) {
  const next = { ...profile };

  if (request.type === "capture") {
    next.distractibilityIndex = clampNumber(next.distractibilityIndex + 0.02, 0.1, 1);
    next.taskSwitchIntensity = clampNumber(next.taskSwitchIntensity + 0.03, 0.1, 1);
    next.revisitReliance = clampNumber(next.revisitReliance + 0.02, 0.1, 1);
  }

  if (request.type === "complete_task") {
    next.distractibilityIndex = clampNumber(next.distractibilityIndex - 0.03, 0.1, 1);
    next.urgencySensitivity = clampNumber(next.urgencySensitivity + 0.02, 0.1, 1);
  }

  if (request.type === "ignore_task") {
    next.avoidanceThemes = Array.from(new Set([...next.avoidanceThemes, ...themeTags])).slice(0, 8);
  }

  if (request.type === "revisit_task" || request.type === "select_agent") {
    next.overfocusThemes = Array.from(new Set([...themeTags, ...next.overfocusThemes])).slice(0, 8);
  }

  if (next.distractibilityIndex > 0.68) {
    next.preferredUpdateMode = "digest";
    next.attentionStyle = "oscillating";
  } else if (next.urgencySensitivity > 0.7) {
    next.preferredUpdateMode = "active";
    next.attentionStyle = "focused_burst";
  } else {
    next.preferredUpdateMode = "silent";
    next.attentionStyle = "nonlinear";
  }

  return next;
}

function inferEmotionalWeight(content: string, type: AdaptationRequest["type"]) {
  const text = content.toLowerCase();
  let weight = 0.34;
  if (/(urgent|important|panic|stress|later|remember|regret|opportunity)/.test(text)) weight += 0.24;
  if (type === "complete_task") weight += 0.16;
  return clampNumber(weight, 0.1, 1);
}

function inferOutcomeWeight(type: AdaptationRequest["type"]) {
  switch (type) {
    case "complete_task":
      return 0.92;
    case "revisit_task":
    case "capture":
      return 0.74;
    case "message":
      return 0.62;
    case "ignore_task":
      return 0.24;
    default:
      return 0.48;
  }
}

function summarizeEvent(type: AdaptationRequest["type"], content: string | undefined, themeTags: string[]) {
  return `${type} :: ${(content ?? themeTags.join(", ")).slice(0, 120)}`;
}

function intersects(left: string[], right: string[]) {
  return left.some((item) => right.includes(item));
}

function hoursBetween(previousIso: string, currentIso: string) {
  const previous = new Date(previousIso).getTime();
  const current = new Date(currentIso).getTime();
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return 0;
  return Math.max(0, (current - previous) / (1000 * 60 * 60));
}

function toLabel(theme: string) {
  return theme
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function getAgentPosition(agentId: string) {
  return agentRegistry.find((agent) => agent.id === agentId)?.position ?? [0, 0, 0];
}
