import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

import { nowIso, uid } from "@/lib/utils";

import { dataPaths, writeJsonFile } from "@/lib/persistence/fs-store";

const execFileAsync = promisify(execFile);

export interface CheckpointResult {
  ok: boolean;
  checkpointId: string;
  message: string;
  commitHash?: string;
  error?: string;
}

export async function createGitCheckpoint(summary: string) {
  const checkpointId = uid("checkpoint");
  const commitMessage = `clawdette-core: ${summary}`;

  try {
    await execFileAsync("git", ["add", "."], { cwd: process.cwd() });
    const commit = await execFileAsync("git", ["commit", "-m", commitMessage], {
      cwd: process.cwd(),
    });
    const commitHash = commit.stdout.match(/\[.+ ([a-f0-9]+)\]/)?.[1];

    const result: CheckpointResult = {
      ok: true,
      checkpointId,
      message: commitMessage,
      commitHash,
    };

    await writeJsonFile(path.join(dataPaths.checkpointDir, `${checkpointId}.json`), {
      ...result,
      createdAt: nowIso(),
    });

    return result;
  } catch (error) {
    const result: CheckpointResult = {
      ok: false,
      checkpointId,
      message: commitMessage,
      error: error instanceof Error ? error.message : "Unknown git checkpoint failure",
    };

    await writeJsonFile(path.join(dataPaths.checkpointDir, `${checkpointId}.json`), {
      ...result,
      createdAt: nowIso(),
    });

    return result;
  }
}
