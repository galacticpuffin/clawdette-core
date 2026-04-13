import path from "node:path";

import { initialCoreState, initialThreads } from "@/lib/memory/bootstrap";
import { nowIso } from "@/lib/utils";
import type { AgentThread, CoreState, SavePayload, ThreadMessage } from "@/types/core";

import { dataPaths, ensureDataScaffold, readJsonFile, writeJsonFile } from "./fs-store";

export async function loadCoreState() {
  await ensureDataScaffold();
  return readJsonFile<CoreState>(dataPaths.state, initialCoreState());
}

export async function saveCoreState(payload: SavePayload) {
  await ensureDataScaffold();

  const state = {
    ...payload.state,
    updatedAt: nowIso(),
  };

  await writeJsonFile(dataPaths.state, state);
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
      readJsonFile<AgentThread>(path.join(dataPaths.threadDir, `${thread.id}.json`), thread),
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
