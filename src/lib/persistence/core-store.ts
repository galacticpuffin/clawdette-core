import path from "node:path";

import { initialCoreState, initialThreads } from "@/lib/memory/bootstrap";
import { applyAdaptationEvent } from "@/lib/neuroplasticity/engine";
import { buildSignals } from "@/lib/neural/signals";
import { nowIso } from "@/lib/utils";
import type { AgentThread, CoreState, SavePayload, TaskThread, ThreadMessage } from "@/types/core";

import { dataPaths, ensureDataScaffold, readJsonFile, writeJsonFile } from "./fs-store";

export async function loadCoreState() {
  await ensureDataScaffold();
  const baseState = initialCoreState();
  const rawState = await readJsonFile<unknown>(dataPaths.state, baseState);
  const { state, repaired } = normalizeCoreState(rawState, baseState);

  if (repaired) {
    console.warn("[CLAWDETTE] persistence state repaired");
    await writeJsonFile(dataPaths.state, state);
  }

  return state;
}

export async function saveCoreState(payload: SavePayload) {
  await ensureDataScaffold();

  let state = {
    ...payload.state,
    updatedAt: nowIso(),
  };

  state = applyAdaptationEvent(state, {
    type: payload.reason === "checkpoint" ? "checkpoint" : "message",
    taskId: state.activeTaskId,
    agentId: state.activeAgentId,
    content: `${payload.reason} save`,
    outcomeWeight: payload.reason === "checkpoint" ? 0.72 : 0.42,
  });
  state = {
    ...state,
    signals: buildSignals(state),
  };

  await writeJsonFile(dataPaths.state, state);
  await writeJsonFile(dataPaths.taskMemory, state.taskThreads);
  await writeJsonFile(dataPaths.notifications, state.notifications);
  await writeJsonFile(dataPaths.workspaces, state.workspace);
  await writeSnapshot(payload.reason, state);

  return state;
}

export async function writeSnapshot(reason: SavePayload["reason"], state: CoreState) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(dataPaths.snapshotDir, `${timestamp}-${reason}.json`);
  await writeJsonFile(snapshotPath, { reason, state });
}

export async function loadThreads() {
  await ensureDataScaffold();
  const defaults = initialThreads();

  await Promise.all(
    defaults.map((thread) =>
      writeJsonFile(path.join(dataPaths.threadDir, `${thread.id}.json`), thread).catch(() => undefined),
    ),
  );

  return Promise.all(
    defaults.map((thread) =>
      readJsonFile<AgentThread>(path.join(dataPaths.threadDir, `${thread.id}.json`), thread).then((loaded) =>
        normalizeThread(loaded, thread),
      ),
    ),
  );
}

export async function appendThreadMessage(agentId: string, message: ThreadMessage) {
  const threadId = `thread_${agentId}`;
  const filePath = path.join(dataPaths.threadDir, `${threadId}.json`);
  const existing = await readJsonFile<AgentThread>(filePath, {
    id: threadId,
    agentId,
    title: `${agentId} Thread`,
    updatedAt: nowIso(),
    messages: [],
  });

  const nextThread: AgentThread = {
    ...existing,
    updatedAt: nowIso(),
    messages: [...existing.messages, message],
  };

  await writeJsonFile(filePath, nextThread);

  return nextThread;
}

function normalizeCoreState(rawState: unknown, baseState: CoreState): { state: CoreState; repaired: boolean } {
  if (!rawState || typeof rawState !== "object") {
    console.error("[CLAWDETTE] invalid node payload", "core state not object");
    return { state: baseState, repaired: true };
  }

  const candidate = rawState as Partial<CoreState>;
  let repaired = false;

  if (!candidate.neuroplasticity) {
    console.warn("[CLAWDETTE] invalid node payload", "missing neuroplasticity");
    repaired = true;
  }

  const taskFallback = baseState.taskThreads[0];
  const taskThreads = Array.isArray(candidate.taskThreads) && taskFallback != null
    ? candidate.taskThreads.map((task) => normalizeTask(task, taskFallback)).filter(Boolean) as TaskThread[]
    : (repaired = true, baseState.taskThreads);

  const normalized: CoreState = {
    ...baseState,
    ...candidate,
    activeAgentId:
      typeof candidate.activeAgentId === "string" &&
      baseState.agents.some((agent) => agent.id === candidate.activeAgentId)
        ? candidate.activeAgentId
        : baseState.activeAgentId,
    activeTaskId:
      typeof candidate.activeTaskId === "string" &&
      taskThreads.some((task) => task.id === candidate.activeTaskId)
        ? candidate.activeTaskId
        : taskThreads[0]?.id,
    agents: Array.isArray(candidate.agents) ? candidate.agents : (repaired = true, baseState.agents),
    memoryArtifacts: Array.isArray(candidate.memoryArtifacts)
      ? candidate.memoryArtifacts
      : (repaired = true, baseState.memoryArtifacts),
    notifications: Array.isArray(candidate.notifications)
      ? candidate.notifications
      : (repaired = true, baseState.notifications),
    taskThreads,
    workspace:
      candidate.workspace && typeof candidate.workspace === "object"
        ? { ...baseState.workspace, ...candidate.workspace }
        : (repaired = true, baseState.workspace),
    activeUser:
      candidate.activeUser && typeof candidate.activeUser === "object"
        ? { ...baseState.activeUser, ...candidate.activeUser }
        : (repaired = true, baseState.activeUser),
    neuroplasticity:
      candidate.neuroplasticity && typeof candidate.neuroplasticity === "object"
        ? {
            ...baseState.neuroplasticity,
            ...candidate.neuroplasticity,
            pathways: Array.isArray(candidate.neuroplasticity.pathways)
              ? candidate.neuroplasticity.pathways
              : baseState.neuroplasticity.pathways,
            memoryClusters: Array.isArray(candidate.neuroplasticity.memoryClusters)
              ? candidate.neuroplasticity.memoryClusters
              : baseState.neuroplasticity.memoryClusters,
            behavioralPatterns: Array.isArray(candidate.neuroplasticity.behavioralPatterns)
              ? candidate.neuroplasticity.behavioralPatterns
              : baseState.neuroplasticity.behavioralPatterns,
            adaptationLog: Array.isArray(candidate.neuroplasticity.adaptationLog)
              ? candidate.neuroplasticity.adaptationLog
              : baseState.neuroplasticity.adaptationLog,
            workingMemoryTaskIds: Array.isArray(candidate.neuroplasticity.workingMemoryTaskIds)
              ? candidate.neuroplasticity.workingMemoryTaskIds
              : baseState.neuroplasticity.workingMemoryTaskIds,
            longTermMemoryTaskIds: Array.isArray(candidate.neuroplasticity.longTermMemoryTaskIds)
              ? candidate.neuroplasticity.longTermMemoryTaskIds
              : baseState.neuroplasticity.longTermMemoryTaskIds,
            cognitiveProfile:
              candidate.neuroplasticity.cognitiveProfile &&
              typeof candidate.neuroplasticity.cognitiveProfile === "object"
                ? {
                    ...baseState.neuroplasticity.cognitiveProfile,
                    ...candidate.neuroplasticity.cognitiveProfile,
                  }
                : baseState.neuroplasticity.cognitiveProfile,
          }
        : baseState.neuroplasticity,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : baseState.updatedAt,
    signals: [],
  };

  normalized.signals = buildSignals(normalized);
  return { state: normalized, repaired };
}

function normalizeTask(rawTask: unknown, fallback: TaskThread) {
  if (!rawTask || typeof rawTask !== "object") {
    console.warn("[CLAWDETTE] invalid node payload", "task thread malformed");
    return fallback;
  }

  const task = rawTask as Partial<TaskThread>;

  return {
    ...fallback,
    ...task,
    assignedAgentIds: Array.isArray(task.assignedAgentIds) ? task.assignedAgentIds : fallback.assignedAgentIds,
    escalationChannels: Array.isArray(task.escalationChannels) ? task.escalationChannels : fallback.escalationChannels,
    themeTags: Array.isArray(task.themeTags) ? task.themeTags : fallback.themeTags,
    createdAt: typeof task.createdAt === "string" ? task.createdAt : fallback.createdAt,
    updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : fallback.updatedAt,
    lastTouchedAt: typeof task.lastTouchedAt === "string" ? task.lastTouchedAt : fallback.lastTouchedAt,
    salience: safeNum(task.salience, fallback.salience),
    decay: safeNum(task.decay, fallback.decay),
    emotionalWeight: safeNum(task.emotionalWeight, fallback.emotionalWeight),
    completionScore: safeNum(task.completionScore, fallback.completionScore),
    revisitCount: safeNum(task.revisitCount, fallback.revisitCount),
  };
}

function safeNum(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeThread(rawThread: AgentThread, fallback: AgentThread) {
  if (!rawThread || typeof rawThread !== "object") {
    console.warn("[CLAWDETTE] invalid node payload", "agent thread malformed");
    return fallback;
  }

  return {
    ...fallback,
    ...rawThread,
    messages: Array.isArray(rawThread.messages) ? rawThread.messages : fallback.messages,
  };
}
