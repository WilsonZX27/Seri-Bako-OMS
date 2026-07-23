import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const localEnvPath = fileURLToPath(new URL("../.env.test.local", import.meta.url));
const localEnv = {};
try {
  for (const line of readFileSync(localEnvPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (match && !match[1].startsWith("NEXT_PUBLIC_")) localEnv[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
} catch {}
const child = spawn(process.execPath, ["--use-system-ca", nextBin, "start", "-p", "3000"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ...localEnv,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  },
  stdio: "inherit",
  windowsHide: true,
});

const shutdown = (signal) => {
  if (!child.killed) child.kill(signal);
  setTimeout(() => process.exit(0), 1_000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
