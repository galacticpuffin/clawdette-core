import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "data");

export const dataPaths = {
  state: path.join(root, "state", "core-state.json"),
  executiveMemory: path.join(root, "memory", "executive-memory.json"),
  sessionMemory: path.join(root, "memory", "session-memory.json"),
  projectMemory: path.join(root, "memory", "project-memory.json"),
  lifeAdminMemory: path.join(root, "memory", "life-admin-memory.json"),
  taskMemory: path.join(root, "memory", "task-memory.json"),
  notifications: path.join(root, "memory", "notifications.json"),
  workspaces: path.join(root, "state", "workspace-profile.json"),
  continuation: path.join(root, "memory", "continuation-summary.json"),
  snapshotDir: path.join(root, "snapshots"),
  checkpointDir: path.join(root, "checkpoints"),
  threadDir: path.join(root, "messages", "threads"),
};

export async function ensureDataScaffold() {
  await Promise.all([
    mkdir(path.dirname(dataPaths.state), { recursive: true }),
    mkdir(path.dirname(dataPaths.executiveMemory), { recursive: true }),
    mkdir(dataPaths.snapshotDir, { recursive: true }),
    mkdir(dataPaths.checkpointDir, { recursive: true }),
    mkdir(dataPaths.threadDir, { recursive: true }),
  ]);
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("[CLAWDETTE] persistence parse failed", {
      filePath,
      message: error instanceof Error ? error.message : "unknown parse error",
    });
    return fallback;
  }
}

export async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}
