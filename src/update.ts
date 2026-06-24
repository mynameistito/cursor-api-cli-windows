import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { installRoot } from "./paths";
import { stopDaemon } from "./daemon";
import { GITHUB_REPO, VERSION } from "./version";

const execFileAsync = promisify(execFile);

export interface ReleaseInfo {
  version: string;
  tag: string;
  downloadUrl: string;
  publishedAt: string;
  releaseNotes: string;
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  body: string;
  assets: GitHubReleaseAsset[];
}

/** Compare semver strings. Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  const av = parse(a);
  const bv = parse(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const diff = (av[i] ?? 0) - (bv[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "cursor-api-cli"
    }
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as GitHubRelease;
  const tag = data.tag_name.replace(/^v/, "");
  const asset = data.assets.find((item) => /^cursor-api-.*-win-x64\.zip$/i.test(item.name));
  if (!asset) {
    throw new Error("Latest release has no Windows x64 zip asset.");
  }

  return {
    version: tag,
    tag: data.tag_name,
    downloadUrl: asset.browser_download_url,
    publishedAt: data.published_at,
    releaseNotes: data.body || ""
  };
}

async function runPowerShell(script: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
  );
  if (stderr?.trim()) {
    // PowerShell writes informational output to stderr; only fail on thrown errors.
  }
  return stdout;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const script = `
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri '${url.replace(/'/g, "''")}' -OutFile '${dest.replace(/'/g, "''")}' -UseBasicParsing
`.trim();
  await runPowerShell(script);
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  mkdirSync(destDir, { recursive: true });
  const script = `
$ProgressPreference = 'SilentlyContinue'
if (Test-Path '${destDir.replace(/'/g, "''")}') { Remove-Item -Recurse -Force '${destDir.replace(/'/g, "''")}' }
New-Item -ItemType Directory -Path '${destDir.replace(/'/g, "''")}' -Force | Out-Null
Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force
`.trim();
  await runPowerShell(script);
}

async function copyBundle(sourceDir: string, targetDir: string): Promise<void> {
  mkdirSync(targetDir, { recursive: true });
  const script = `
$ProgressPreference = 'SilentlyContinue'
Copy-Item -Path (Join-Path '${sourceDir.replace(/'/g, "''")}' '*') -Destination '${targetDir.replace(/'/g, "''")}' -Recurse -Force
`.trim();
  await runPowerShell(script);
}

export async function checkForUpdate(): Promise<{
  current: string;
  latest: ReleaseInfo | null;
  updateAvailable: boolean;
}> {
  const latest = await fetchLatestRelease();
  if (!latest) {
    return { current: VERSION, latest: null, updateAvailable: false };
  }
  return {
    current: VERSION,
    latest,
    updateAvailable: compareSemver(latest.version, VERSION) > 0
  };
}

export async function runUpdate(options: { force?: boolean } = {}): Promise<void> {
  const { current, latest, updateAvailable } = await checkForUpdate();
  if (!latest) {
    throw new Error("No published releases found. Install from source or wait for the first GitHub release.");
  }

  if (!updateAvailable && !options.force) {
    console.log(`cursor-api ${current} is up to date.`);
    return;
  }

  if (updateAvailable) {
    console.log(`Updating cursor-api ${current} -> ${latest.version}`);
  } else {
    console.log(`Reinstalling cursor-api ${current}`);
  }

  const wasRunning = existsSync(join(process.env.APPDATA || "", "cursor-api", "run", "cursor-api.pid"));
  if (wasRunning) {
    console.log("Stopping cursor-api…");
    await stopDaemon();
  }

  const workDir = join(tmpdir(), `cursor-api-update-${latest.version}`);
  const zipPath = join(workDir, "bundle.zip");
  const extractDir = join(workDir, "extract");

  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  console.log("Downloading release…");
  await downloadFile(latest.downloadUrl, zipPath);

  console.log("Extracting…");
  await extractZip(zipPath, extractDir);

  const targetDir = installRoot();
  console.log(`Installing to ${targetDir}…`);
  await copyBundle(extractDir, targetDir);

  rmSync(workDir, { recursive: true, force: true });

  console.log(`cursor-api updated to ${latest.version}.`);
  if (wasRunning) {
    console.log("Run: cursor-api start");
  }
}

/** Persist last update check result for `cursor-api status`. */
export function recordUpdateCheck(result: Awaited<ReturnType<typeof checkForUpdate>>): void {
  const dir = join(process.env.APPDATA || "", "cursor-api");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "update-check.json"),
    `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`,
    "utf8"
  );
}

export function readLastUpdateCheck(): Record<string, unknown> | null {
  const path = join(process.env.APPDATA || "", "cursor-api", "update-check.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}
