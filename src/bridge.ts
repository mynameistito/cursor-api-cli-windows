import { createServer, type Server } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { bridgeDir, bridgeNodePath, bridgeScriptPath } from "./paths";
import { appendLog } from "./logs";

const DEFAULT_BRIDGE_PORT = 8792;
const BRIDGE_PORT_SCAN = 100;
const BRIDGE_RUN_TIMEOUT_MS = 120_000;

export interface BridgeHandle {
  port: number;
  token: string;
  child: ChildProcess;
  close(): Promise<void>;
}

function pickBridgePort(): Promise<number> {
  return new Promise((resolve) => {
    const tryPort = (offset: number) => {
      if (offset > BRIDGE_PORT_SCAN) {
        resolve(DEFAULT_BRIDGE_PORT);
        return;
      }
      const port = DEFAULT_BRIDGE_PORT + offset;
      const server: Server = createServer();
      server.once("error", () => tryPort(offset + 1));
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
    };
    tryPort(0);
  });
}

function pipeChild(channel: "bridge", child: ChildProcess): void {
  child.stdout?.on("data", (buf) => {
    for (const line of buf.toString().split("\n")) {
      if (line.trim()) appendLog(channel, line);
    }
  });
  child.stderr?.on("data", (buf) => {
    for (const line of buf.toString().split("\n")) {
      if (line.trim()) appendLog(channel, line);
    }
  });
}

export function assertBridgeRuntime(): void {
  const script = bridgeScriptPath();
  const node = bridgeNodePath();
  const dir = bridgeDir();
  if (!existsSync(script)) {
    throw new Error(`Bridge script not found: ${script}. Run "bun run stage:bridge" or reinstall.`);
  }
  if (!existsSync(node)) {
    throw new Error(`Bundled Node runtime not found: ${node}. Run "bun run stage:bridge" or reinstall.`);
  }
  if (!existsSync(dir)) {
    throw new Error(`Bridge directory not found: ${dir}`);
  }
}

/** Spawn the @cursor/sdk bridge (must run under Node, not Bun). */
export async function startBridge(): Promise<BridgeHandle> {
  assertBridgeRuntime();

  const port = await pickBridgePort();
  const token = randomBytes(16).toString("hex");
  const node = bridgeNodePath();
  const script = bridgeScriptPath();

  const child = spawn(node, [script], {
    cwd: bridgeDir(),
    env: {
      ...process.env,
      CURSOR_SDK_BRIDGE_HOST: "127.0.0.1",
      CURSOR_SDK_BRIDGE_PORT: String(port),
      CURSOR_SDK_BRIDGE_TOKEN: token,
      CURSOR_SDK_BRIDGE_RUN_TIMEOUT_MS: String(BRIDGE_RUN_TIMEOUT_MS)
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  pipeChild("bridge", child);

  child.on("exit", (code, signal) => {
    appendLog("bridge", `process exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
  });

  return {
    port,
    token,
    child,
    close: () =>
      new Promise((resolve) => {
        if (child.killed) {
          resolve();
          return;
        }
        child.once("exit", () => resolve());
        child.kill();
      })
  };
}

export function bridgeUrl(port: number): string {
  return `http://127.0.0.1:${port}/sdk`;
}
