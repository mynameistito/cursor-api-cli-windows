/**
 * Build cursor-api.exe and stage a distributable folder under dist/.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { $ } from "bun";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const bundleDir = join(dist, "cursor-api");

rmSync(dist, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

console.log("Staging bridge runtime…");
await $`bun run scripts/stage-bridge.ts`.cwd(root);

console.log("Compiling cursor-api.exe…");
const exePath = join(bundleDir, "cursor-api.exe");
await $`bun build src/cli.ts --compile --outfile ${exePath}`.cwd(root);

const bridgeSrc = join(root, "bridge");
const bridgeDst = join(bundleDir, "bridge");
cpSync(bridgeSrc, bridgeDst, { recursive: true });

const installScript = join(root, "scripts", "install.ps1");
if (existsSync(installScript)) {
  cpSync(installScript, join(bundleDir, "install.ps1"));
}

const readme = join(bundleDir, "README.txt");
await Bun.write(
  readme,
  [
    "cursor-api for Windows",
    "",
    "Usage:",
    "  cursor-api.exe key set",
    "  cursor-api.exe start",
    "  cursor-api.exe status",
    "  cursor-api.exe logs -f",
    "",
    "Add this folder to PATH, or copy it to Program Files.",
    "Docs: https://github.com/mynameistito/cursor-api-cli-windows"
  ].join("\n")
);

console.log(`\nBuilt: ${bundleDir}`);
console.log("  cursor-api.exe");
console.log("  bridge/");

if (!existsSync(join(bridgeDst, "node.exe"))) {
  console.warn("Warning: bridge/node.exe was not staged. Run: bun run stage:bridge");
}
