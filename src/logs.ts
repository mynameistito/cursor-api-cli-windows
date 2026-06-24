import { createWriteStream, existsSync, openSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { logsDir, ensureConfigDirs } from "./config";

export type LogChannel = "server" | "bridge" | "daemon";

function logFile(channel: LogChannel): string {
  ensureConfigDirs();
  return join(logsDir(), `${channel}.log`);
}

export function appendLog(channel: LogChannel, line: string): void {
  const path = logFile(channel);
  const stream = createWriteStream(path, { flags: "a" });
  const stamped = `[${new Date().toISOString()}] ${line}\n`;
  stream.write(stamped);
  stream.end();
}

export function createLogStream(channel: LogChannel) {
  ensureConfigDirs();
  const fd = openSync(logFile(channel), "a");
  return createWriteStream("", { fd, flags: "a" });
}

export function readRecentLogs(channel: LogChannel | "all", lines = 80): string[] {
  const files =
    channel === "all"
      ? (["daemon", "server", "bridge"] as LogChannel[]).map((c) => logFile(c))
      : [logFile(channel)];

  const output: string[] = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8").trim();
    if (!content) continue;
    const label = file.includes("bridge") ? "bridge" : file.includes("server") ? "server" : "daemon";
    const chunk = content.split("\n").slice(-lines);
    for (const line of chunk) {
      output.push(`[${label}] ${line}`);
    }
  }
  return output.slice(-lines);
}

export async function followLogs(channel: LogChannel | "all"): Promise<void> {
  const targets =
    channel === "all"
      ? (["daemon", "server", "bridge"] as LogChannel[])
      : [channel];

  const positions = new Map<string, number>();
  for (const ch of targets) {
    const file = logFile(ch);
    positions.set(file, existsSync(file) ? statSync(file).size : 0);
  }

  process.stdout.write(`Following logs in ${logsDir()} (Ctrl+C to exit)\n`);

  for (;;) {
    for (const ch of targets) {
      const file = logFile(ch);
      if (!existsSync(file)) continue;
      const size = statSync(file).size;
      const prev = positions.get(file) ?? 0;
      if (size <= prev) continue;
      const buf = readFileSync(file);
      const chunk = buf.subarray(prev, size).toString("utf8");
      positions.set(file, size);
      for (const line of chunk.split("\n")) {
        if (line.trim()) process.stdout.write(`[${ch}] ${line}\n`);
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

export function listLogFiles(): string[] {
  ensureConfigDirs();
  return readdirSync(logsDir())
    .filter((name) => name.endsWith(".log"))
    .map((name) => join(logsDir(), name));
}
