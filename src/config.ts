import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const APP_NAME = "cursor-api";
export const DEFAULT_PORT = 8787;
export const LOCAL_API_KEY_LITERAL = "cursor-local";

export interface Settings {
  port: number;
  autostart: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  port: DEFAULT_PORT,
  autostart: false
};

function configDir(): string {
  const base = process.env.APPDATA;
  if (!base) {
    throw new Error("APPDATA is not set");
  }
  return join(base, APP_NAME);
}

export function settingsPath(): string {
  return join(configDir(), "settings.json");
}

export function runDir(): string {
  return join(configDir(), "run");
}

export function logsDir(): string {
  return join(configDir(), "logs");
}

export function pidFilePath(): string {
  return join(runDir(), "cursor-api.pid");
}

export function stateFilePath(): string {
  return join(runDir(), "state.json");
}

export function ensureConfigDirs(): void {
  mkdirSync(configDir(), { recursive: true });
  mkdirSync(runDir(), { recursive: true });
  mkdirSync(logsDir(), { recursive: true });
}

export function loadSettings(): Settings {
  try {
    const raw = readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      port: parsed.port ?? DEFAULT_PORT,
      autostart: parsed.autostart ?? false
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  ensureConfigDirs();
  writeFileSync(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export function baseUrl(port = loadSettings().port): string {
  return `http://127.0.0.1:${port}/v1`;
}
