import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const cwd = process.cwd();
const intervalMs = Number(process.env.CLAWDETTE_AUTOSAVE_INTERVAL_MS ?? 45000);
const branch = (await execFileAsync("git", ["branch", "--show-current"], { cwd })).stdout.trim();

console.log(`[CLAWDETTE] Local Git autosave running on branch ${branch || "unknown"}`);
console.log(`[CLAWDETTE] Autosave interval ${intervalMs}ms`);

let busy = false;

async function autosaveOnce() {
  if (busy) return;
  busy = true;

  try {
    const status = (await execFileAsync("git", ["status", "--porcelain"], { cwd })).stdout.trim();

    if (!status) {
      return;
    }

    await execFileAsync("git", ["add", "-A"], { cwd });

    try {
      await execFileAsync("git", ["diff", "--cached", "--quiet"], { cwd });
      return;
    } catch {
      const timestamp = new Date().toISOString();
      const message = `autosave: ${timestamp}`;
      await execFileAsync("git", ["commit", "-m", message], { cwd });
      console.log(`[CLAWDETTE] Local autosave committed: ${message}`);
    }
  } catch (error) {
    console.error("[CLAWDETTE] Local autosave failed", error instanceof Error ? error.message : error);
  } finally {
    busy = false;
  }
}

await autosaveOnce();
const timer = setInterval(() => {
  void autosaveOnce();
}, intervalMs);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    clearInterval(timer);
    process.exit(0);
  });
}
