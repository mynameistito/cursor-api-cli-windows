import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(srcDir, "..");

/** Install / project root (directory containing `bridge/`). */
export function installRoot(): string {
  if (process.env.CURSOR_API_HOME?.trim()) {
    return process.env.CURSOR_API_HOME.trim();
  }

  // Compiled binary: resources sit next to cursor-api.exe.
  const exeDir = dirname(process.execPath);
  if (existsSync(join(exeDir, "bridge", "cursor-sdk-local-agent-bridge.mjs"))) {
    return exeDir;
  }

  return projectRoot;
}

export function bridgeDir(): string {
  return join(installRoot(), "bridge");
}

export function bridgeScriptPath(): string {
  return join(bridgeDir(), "cursor-sdk-local-agent-bridge.mjs");
}

export function bridgeNodePath(): string {
  return join(bridgeDir(), "node.exe");
}
