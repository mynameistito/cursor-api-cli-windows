import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_NAME, ensureConfigDirs } from "./config";

/** Independent credential namespace (does not share with API for Cursor GUI). */
export const CREDENTIAL_SERVICE = "ai.cursorapi.cli";
export const CREDENTIAL_ACCOUNT = "cursor-api-key";

const SECRET_FILE = "api-key.enc";

function secretPath(): string {
  return join(process.env.APPDATA || "", APP_NAME, SECRET_FILE);
}

function deriveKey(): Buffer {
  const material = `${process.env.USERNAME || "user"}@${process.env.COMPUTERNAME || "pc"}:${CREDENTIAL_SERVICE}`;
  return createHash("sha256").update(material).digest();
}

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function readFromFile(): string {
  const path = secretPath();
  if (!existsSync(path)) return "";
  try {
    return decrypt(readFileSync(path, "utf8").trim());
  } catch {
    return "";
  }
}

function writeToFile(key: string): void {
  ensureConfigDirs();
  writeFileSync(secretPath(), encrypt(key.trim()), "utf8");
}

function deleteFile(): void {
  const path = secretPath();
  if (existsSync(path)) unlinkSync(path);
}

/** Read the stored Cursor API key, or empty string when unset. */
export async function readApiKey(): Promise<string> {
  return readFromFile();
}

/** Persist the Cursor API key (trimmed). */
export async function writeApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) {
    throw new Error("API key cannot be empty");
  }
  writeToFile(trimmed);
}

/** Remove the stored API key. */
export async function deleteApiKey(): Promise<void> {
  deleteFile();
}

/** Mask a key for display (`crsr_…xxxx`). */
export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "(not set)";
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 5)}…${trimmed.slice(-4)}`;
}
