import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const command = process.platform === "win32" ? process.execPath : resolve("node_modules", ".bin", "supabase");
const commandArgs = process.platform === "win32"
  ? [resolve("node_modules", "supabase", "dist", "supabase.js"), "status", "-o", "env"]
  : ["status", "-o", "env"];
const raw = execFileSync(command, commandArgs, {
  cwd: process.cwd(),
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "true" },
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const status = Object.fromEntries(raw.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (!match) return [];
  return [[match[1], match[2].replace(/^"|"$/g, "")]];
}));
if (!status.API_URL || !status.PUBLISHABLE_KEY || !status.SERVICE_ROLE_KEY) {
  throw new Error("Local Supabase status did not provide API_URL, PUBLISHABLE_KEY, and SERVICE_ROLE_KEY.");
}
const target = new URL(status.API_URL);
if (!["127.0.0.1", "localhost"].includes(target.hostname)) {
  throw new Error(`Refusing to create a UAT fixture for non-loopback host ${target.hostname}.`);
}
const password = () => `Uat-${randomBytes(18).toString("base64url")}!9a`;
const roles = [
  ["SUPER_ADMIN", "owner"],
  ["PEOPLE_OPERATIONS", "people-operations"],
  ["FINANCE", "finance"],
  ["MANAGER", "manager"],
  ["PURCHASING", "purchasing"],
  ["KITCHEN", "kitchen"],
  ["OUTLET_SUPERVISOR", "outlet-supervisor"],
  ["OUTLET", "outlet"],
];
const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  "TEST_BASE_URL=http://127.0.0.1:3109",
  "RUN_TENANT_BOUNDARY_E2E=1",
  ...roles.flatMap(([key, slug]) => [
    `TEST_${key}_EMAIL=${slug}@seri-bako-uat.example.test`,
    `TEST_${key}_PASSWORD=${password()}`,
  ]),
];
const path = resolve(".env.test.local");
writeFileSync(path, `${lines.join("\n")}\n`, { mode: 0o600 });
if (process.platform !== "win32") chmodSync(path, 0o600);
console.log("Prepared ignored loopback-only .env.test.local for eight disposable roles.");
