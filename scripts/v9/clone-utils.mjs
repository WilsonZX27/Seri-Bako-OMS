import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const CLONE_MARKER = resolve("test-results", "production-like-clone.json");

export function parseEnvFile(filePath) {
  if (!filePath || !existsSync(filePath)) throw new Error(`Environment file not found: ${filePath || "(missing)"}`);
  const values = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      const comment = value.match(/\s+#/);
      if (comment?.index !== undefined) value = value.slice(0, comment.index).trim();
    }
    values[match[1]] = value;
  }
  return values;
}

export function option(name, argv = process.argv.slice(2)) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
}

export function hasFlag(name, argv = process.argv.slice(2)) {
  return argv.includes(`--${name}`);
}

export function normalizeTtlHours(raw) {
  const value = Number(raw ?? 12);
  if (!Number.isFinite(value) || value <= 0 || value > 24) throw new Error("Clone TTL must be greater than 0 and no more than 24 hours.");
  return value;
}

export function assertLoopbackUrl(raw, label) {
  if (!raw) throw new Error(`${label} is required.`);
  const url = new URL(raw);
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(url.hostname)) {
    throw new Error(`${label} must target loopback; received ${url.hostname}.`);
  }
  return url;
}

export function readLinkedProjectRef(root = process.cwd()) {
  const path = resolve(root, "supabase", ".temp", "project-ref");
  if (!existsSync(path)) throw new Error("The repository is not linked to a Supabase project.");
  return readFileSync(path, "utf8").trim();
}

export function assertLinkedProjectRef(expected, root = process.cwd()) {
  if (!expected) throw new Error("EXPECTED_SUPABASE_PROJECT_REF is required.");
  const actual = readLinkedProjectRef(root);
  if (actual !== expected) throw new Error(`Supabase project mismatch: expected ${expected}, received ${actual || "(empty)"}.`);
  return actual;
}

export function readLocalProjectId(root = process.cwd()) {
  const config = readFileSync(resolve(root, "supabase", "config.toml"), "utf8");
  const match = config.match(/^project_id\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error("supabase/config.toml does not declare project_id.");
  return match[1];
}

export function localDatabaseContainer(root = process.cwd()) {
  return `supabase_db_${readLocalProjectId(root)}`;
}

export function assertLocalContainer(container) {
  const running = execFileSync("docker", ["inspect", "--format", "{{.State.Running}}", container], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (running !== "true") throw new Error(`Local Supabase database container is not running: ${container}`);
}

export function runSupabase(args, options = {}) {
  const command = process.platform === "win32" ? process.execPath : resolve("node_modules", ".bin", "supabase");
  const commandArgs = process.platform === "win32"
    ? [resolve("node_modules", "supabase", "dist", "supabase.js"), ...args]
    : args;
  return execFileSync(command, commandArgs, {
    cwd: process.cwd(),
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "true", ...options.env },
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
}
