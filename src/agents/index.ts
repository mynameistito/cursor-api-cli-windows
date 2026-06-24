import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { LOCAL_API_KEY_LITERAL } from "../config";

const BRAND = "cursor-api";
const LOCAL_API_KEY = LOCAL_API_KEY_LITERAL;

export interface AgentInfo {
  id: string;
  name: string;
  status: "configured" | "not_configured" | "not_installed";
}

function configHome(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg?.trim() && xdg.startsWith("/")) return xdg;
  return join(homedir(), ".config");
}

function epochMs(): number {
  return Date.now();
}

function backupIfChanged(path: string, nextContents: string): void {
  if (!existsSync(path)) return;
  const prev = readFileSync(path, "utf8");
  if (prev === nextContents) return;
  const backup = `${path}.cursor-api-backup.${epochMs()}`;
  writeFileSync(backup, prev, "utf8");
}

function writePrettyJson(path: string, value: unknown): void {
  const dir = join(path, "..");
  mkdirSync(dir, { recursive: true });
  const contents = `${JSON.stringify(value, null, 2)}\n`;
  backupIfChanged(path, contents);
  writeFileSync(path, contents, "utf8");
}

function readJson(path: string, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  if (!existsSync(path)) return { ...fallback };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return typeof parsed === "object" && parsed && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function costLimitModels(): Record<string, unknown> {
  return {
    "composer-2.5": {
      name: "Composer 2.5",
      cost: { input: 0.5, output: 2.5 },
      limit: { context: 200000, output: 65536 }
    },
    "composer-2.5-fast": {
      name: "Composer 2.5 Fast",
      cost: { input: 3.0, output: 15.0 },
      limit: { context: 200000, output: 65536 }
    }
  };
}

function opencodePath(): string {
  return join(configHome(), "opencode", "opencode.json");
}

function configureOpencode(baseUrl: string): string {
  const path = opencodePath();
  const root = readJson(path);
  const provider =
    typeof root.provider === "object" && root.provider && !Array.isArray(root.provider)
      ? { ...(root.provider as Record<string, unknown>) }
      : {};

  delete provider.cursor;
  delete provider.cursorsdk;
  provider.cursorapi = {
    npm: "@ai-sdk/openai-compatible",
    name: BRAND,
    options: { baseURL: baseUrl, apiKey: LOCAL_API_KEY },
    models: costLimitModels()
  };
  root.provider = provider;

  const model = typeof root.model === "string" ? root.model : "";
  if (!model || model.startsWith("cursor/") || model.startsWith("cursorsdk/")) {
    root.model = "cursorapi/composer-2.5-fast";
  }

  writePrettyJson(path, root);
  return path;
}

function opencodeStatus(): AgentInfo["status"] {
  const path = opencodePath();
  const root = readJson(path);
  const provider = root.provider;
  if (typeof provider === "object" && provider && !Array.isArray(provider)) {
    if ("cursorapi" in (provider as Record<string, unknown>)) return "configured";
  }
  return existsSync(path) ? "not_configured" : "not_configured";
}

const AGENTS: Array<{ id: string; name: string; status: () => AgentInfo["status"] }> = [
  { id: "opencode", name: "OpenCode", status: opencodeStatus },
  { id: "codex", name: "Codex", status: () => "not_configured" },
  { id: "vscode", name: "VS Code", status: () => "not_configured" },
  { id: "cline", name: "Cline", status: () => "not_configured" },
  { id: "kilo", name: "Kilo Code", status: () => "not_configured" },
  { id: "pi", name: "pi", status: () => "not_configured" }
];

export async function listAgents(): Promise<AgentInfo[]> {
  return AGENTS.map((agent) => ({
    id: agent.id,
    name: agent.name,
    status: agent.status()
  }));
}

export async function configureAgent(agentId: string, baseUrl: string): Promise<string> {
  switch (agentId.toLowerCase()) {
    case "opencode":
      return `Configured OpenCode at ${configureOpencode(baseUrl)}`;
    default:
      throw new Error(
        `Agent "${agentId}" is not ported yet in the CLI draft. OpenCode is supported; others coming soon.`
      );
  }
}
