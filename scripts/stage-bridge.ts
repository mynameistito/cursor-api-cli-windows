/**
 * Stage the SDK bridge runtime: node.exe + @cursor/sdk + bridge script.
 *
 * The bridge cannot be bun-compiled (@cursor/sdk sqlite3 native addon) and must
 * run under Node (Bun's HTTP/2 client breaks SDK gRPC).
 */
import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { $ } from "bun";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bridgeDir = join(root, "bridge");

mkdirSync(bridgeDir, { recursive: true });

const scriptSrc = join(bridgeDir, "cursor-sdk-local-agent-bridge.mjs");
if (!existsSync(scriptSrc)) {
  throw new Error(`Missing bridge script at ${scriptSrc}`);
}

console.log("Installing bridge dependencies…");
await $`npm install --omit=dev`.cwd(bridgeDir);

const nodeExe = process.execPath.endsWith("bun.exe") || process.execPath.endsWith("bun")
  ? (await $`where node`.text()).trim().split(/\r?\n/)[0]
  : process.execPath;

if (!nodeExe || !existsSync(nodeExe)) {
  throw new Error("Node.js is required to stage the bridge runtime (node.exe).");
}

copyFileSync(nodeExe, join(bridgeDir, "node.exe"));
console.log(`Staged bridge runtime at ${bridgeDir}`);
