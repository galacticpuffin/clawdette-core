import net from "node:net";
import { spawn } from "node:child_process";

const HOST = "127.0.0.1";
const PORT_CANDIDATES = [3000, 3001];

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket
      .once("connect", () => {
        socket.destroy();
        resolve(true);
      })
      .once("error", () => {
        resolve(false);
      })
      .once("timeout", () => {
        socket.destroy();
        resolve(false);
      })
      .setTimeout(250)
      .connect(port, host);
  });
}

async function pickPort() {
  for (const port of PORT_CANDIDATES) {
    const inUse = await canConnect(HOST, port);
    if (!inUse) return port;
  }

  return PORT_CANDIDATES[PORT_CANDIDATES.length - 1];
}

const port = await pickPort();
const url = `http://${HOST}:${port}`;

console.log(`[CLAWDETTE] Local dev bootstrap starting`);
console.log(`[CLAWDETTE] Binding Next.js to ${url}`);

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "dev", "--hostname", HOST, "--port", String(port)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: HOST,
      CLAWDETTE_DEV_URL: url,
    },
  },
);

child.on("spawn", () => {
  console.log(`[CLAWDETTE] Next.js process spawned. Open ${url}`);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[CLAWDETTE] Dev server exited unexpectedly from signal ${signal}`);
    process.exit(1);
  }

  if ((code ?? 1) !== 0) {
    console.error(`[CLAWDETTE] Dev server exited with code ${code}`);
    process.exit(code ?? 1);
  }
});

for (const event of ["SIGINT", "SIGTERM"]) {
  process.on(event, () => {
    child.kill(event);
  });
}
