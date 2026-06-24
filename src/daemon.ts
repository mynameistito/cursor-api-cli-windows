import { spawn, execFile } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { readApiKey } from "./credentials";
import {
  baseUrl,
  ensureConfigDirs,
  loadSettings,
  pidFilePath,
  runDir,
  stateFilePath
} from "./config";
import { appendLog, createLogStream } from "./logs";
import { bridgeUrl, startBridge, type BridgeHandle } from "./bridge";
import { startHttpServer, type HttpServerHandle } from "./server";

const execFileAsync = promisify(execFile);

interface DaemonState {
  pid: number;
  port: number;
  bridgePort: number | null;
  startedAt: string;
}

interface RunningHandles {
  bridge: BridgeHandle | null;
  server: HttpServerHandle;
}

function readPid(): number | null {
  if (!existsSync(pidFilePath())) return null;
  const raw = readFileSync(pidFilePath(), "utf8").trim();
  const pid = Number.parseInt(raw, 10);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function writePid(pid: number): void {
  ensureConfigDirs();
  writeFileSync(pidFilePath(), `${pid}\n`, "utf8");
}

function clearPid(): void {
  if (existsSync(pidFilePath())) unlinkSync(pidFilePath());
}

function writeState(state: DaemonState): void {
  ensureConfigDirs();
  writeFileSync(stateFilePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function readState(): DaemonState | null {
  if (!existsSync(stateFilePath())) return null;
  try {
    return JSON.parse(readFileSync(stateFilePath(), "utf8")) as DaemonState;
  } catch {
    return null;
  }
}

function clearState(): void {
  if (existsSync(stateFilePath())) unlinkSync(stateFilePath());
}

async function isProcessAlive(pid: number): Promise<boolean> {
  try {
    await execFileAsync("tasklist", ["/FI", `PID eq ${pid}`, "/NH"], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function daemonSpawnArgs(): string[] {
  const entry = process.argv[1] ?? "";
  if (entry.endsWith(".ts") || entry.endsWith(".js")) {
    return [entry, "daemon"];
  }
  return ["daemon"];
}

export async function getStatus(): Promise<{
  running: boolean;
  pid: number | null;
  port: number;
  baseUrl: string;
  bridgePort: number | null;
  hasApiKey: boolean;
}> {
  const settings = loadSettings();
  const pid = readPid();
  const state = readState();
  const running = pid ? await isProcessAlive(pid) : false;
  const apiKey = await readApiKey();

  if (pid && !running) {
    clearPid();
    clearState();
  }

  return {
    running,
    pid: running ? pid : null,
    port: state?.port ?? settings.port,
    baseUrl: baseUrl(state?.port ?? settings.port),
    bridgePort: state?.bridgePort ?? null,
    hasApiKey: Boolean(apiKey.trim())
  };
}

export async function startDaemon(): Promise<void> {
  const status = await getStatus();
  if (status.running) {
    console.log(`cursor-api is already running (pid ${status.pid})`);
    console.log(`Base URL: ${status.baseUrl}`);
    return;
  }

  ensureConfigDirs();
  const out = createLogStream("daemon");
  const err = createLogStream("daemon");

  const child = spawn(process.execPath, daemonSpawnArgs(), {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: process.env
  });

  child.stdout?.pipe(out);
  child.stderr?.pipe(err);
  child.unref();

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const next = await getStatus();
    if (next.running) {
      console.log(`cursor-api started (pid ${next.pid})`);
      console.log(`Base URL: ${next.baseUrl}`);
      console.log(`Logs: ${runDir().replace(/\\run$/, "\\logs")}`);
      return;
    }
  }

  throw new Error("Timed out waiting for cursor-api to start. Check logs with: cursor-api logs");
}

export async function stopDaemon(): Promise<void> {
  const pid = readPid();
  if (!pid) {
    console.log("cursor-api is not running");
    clearState();
    return;
  }

  try {
    await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
  } catch (error) {
    const alive = await isProcessAlive(pid);
    if (alive) throw error;
  }

  clearPid();
  clearState();
  console.log("cursor-api stopped");
}

export async function runDaemonForeground(): Promise<void> {
  const existing = readPid();
  if (existing && (await isProcessAlive(existing)) && existing !== process.pid) {
    appendLog("daemon", `another instance is already running (pid ${existing})`);
    process.exit(1);
  }

  const settings = loadSettings();
  const apiKey = await readApiKey();
  if (!apiKey.trim()) {
    appendLog("daemon", "no API key configured; run: cursor-api key set");
    console.error("No API key configured. Run: cursor-api key set");
    process.exit(1);
  }

  writePid(process.pid);

  process.env.PORT = String(settings.port);
  process.env.CURSOR_API_KEY = apiKey;

  let bridge: BridgeHandle | null = null;
  try {
    bridge = await startBridge();
    process.env.CURSOR_SDK_BRIDGE_URL = bridgeUrl(bridge.port);
    process.env.CURSOR_SDK_BRIDGE_TOKEN = bridge.token;
  } catch (error) {
    appendLog("daemon", `bridge failed to start: ${String(error)}`);
    bridge = null;
  }

  const server = await startHttpServer(settings.port);
  writeState({
    pid: process.pid,
    port: settings.port,
    bridgePort: bridge?.port ?? null,
    startedAt: new Date().toISOString()
  });

  appendLog("daemon", `listening on ${baseUrl(settings.port)}`);
  appendLog("server", `API server running at ${baseUrl(settings.port)}`);

  const shutdown = async () => {
    appendLog("daemon", "shutting down");
    await server.close();
    if (bridge) await bridge.close();
    clearPid();
    clearState();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  // Keep process alive.
  await new Promise(() => {});
}

export async function checkHealth(port = loadSettings().port): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}/health`);
}
