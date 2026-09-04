import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const localEnvPath = resolve(root, ".env.test.local");
const mode = process.argv[2];
const envOptionIndex = process.argv.indexOf("--env");
const selectedEnvValue = envOptionIndex >= 0 ? process.argv[envOptionIndex + 1] : null;
const selectedEnvPath = selectedEnvValue ? resolve(root, selectedEnvValue) : null;
if (!new Set(["local", "full", "preview"]).has(mode)) throw new Error("Use run-uat.mjs with local, full, or preview mode.");
if (mode !== "preview" && !existsSync(localEnvPath)) throw new Error("v9 UAT requires the ignored .env.test.local fixture file.");
if (mode === "preview" && (!selectedEnvPath || !existsSync(selectedEnvPath))) throw new Error("Preview UAT requires an explicit env file: --env .env.preview.test.local");

function loadLocalEnv() {
  const result = {};
  for (const line of readFileSync(localEnvPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      const comment = value.match(/\s+#/);
      if (comment?.index !== undefined) value = value.slice(0, comment.index).trim();
    }
    result[key] = value;
  }
  return result;
}

function loadSelectedEnv() {
  const envPath = mode === "preview" ? selectedEnvPath : localEnvPath;
  const result = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[key] = value;
  }
  return result;
}

function assertPreviewTarget() {
  const result = spawnSync(process.execPath, [resolve(root, "scripts", "check-uat-environment.mjs"), "--target", "preview", "--env", selectedEnvPath], {
    cwd: root,
    env: { ...process.env, ...loadSelectedEnv() },
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error("Preview UAT environment guard failed; no browser shard was started.");
}

if (mode === "preview") assertPreviewTarget();

const baseEnv = {
  ...process.env,
  ...(mode === "preview" ? loadSelectedEnv() : loadLocalEnv()),
  RUN_TENANT_BOUNDARY_E2E: "1",
  PLAYWRIGHT_LOCAL_PORT: process.env.PLAYWRIGHT_LOCAL_PORT || "3109",
};
if (mode === "preview") {
  delete baseEnv.RUN_TENANT_BOUNDARY_E2E;
  baseEnv.ALLOW_REMOTE_E2E = "1";
  baseEnv.PLAYWRIGHT_SERVER_MODE = "remote";
}
delete baseEnv.RUN_V9_LOCAL_UAT;
delete baseEnv.RUN_V9_FULL_UAT;
if (mode === "full") baseEnv.RUN_V9_FULL_UAT = "1";
if (mode === "local") baseEnv.RUN_V9_LOCAL_UAT = "1";

const cli = resolve(root, "node_modules", "@playwright", "test", "cli.js");
const playwrightArgs = [
  cli,
  "test",
  "tests/e2e/v9-full-system-uat.spec.js",
  "--reporter=line",
  ...process.argv.slice(3),
];

function runShard(label, selection = {}) {
  console.log(`\n[v9 UAT] ${label}`);
  return new Promise((resolveShard) => {
    const child = spawn(process.execPath, playwrightArgs, {
      cwd: root,
      env: { ...baseEnv, ...selection },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", (error) => {
      console.error(`v9 UAT shard failed to start: ${error.message}`);
      resolveShard(1);
    });
    child.once("exit", (code, signal) => {
      if (signal) console.error(`v9 UAT shard stopped by ${signal}.`);
      resolveShard(signal ? 1 : code ?? 1);
    });
  });
}

function buildProductionAudit() {
  console.log("\n[v9 UAT] building isolated production audit target");
  const nextCli = resolve(root, "node_modules", "next", "dist", "bin", "next");
  return new Promise((resolveBuild) => {
    const child = spawn(process.execPath, [nextCli, "build"], {
      cwd: root,
      env: {
        ...process.env,
        ...loadLocalEnv(),
        NEXT_DIST_DIR: ".next-playwright-production",
      },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", (error) => {
      console.error(`v9 UAT production build failed to start: ${error.message}`);
      resolveBuild(1);
    });
    child.once("exit", (code, signal) => resolveBuild(signal ? 1 : code ?? 1));
  });
}

const explicitSelection = ["V9_UAT_ROLES", "V9_UAT_VIEWPORTS", "V9_UAT_ROUTES", "V9_UAT_SURFACE"]
  .some((key) => baseEnv[key]?.trim());

if (explicitSelection) {
  if (mode !== "preview" && baseEnv.V9_UAT_REBUILD === "1") {
    const buildCode = await buildProductionAudit();
    if (buildCode !== 0) throw new Error("v9 UAT production build failed; focused selection was not started.");
    baseEnv.PLAYWRIGHT_SERVER_MODE = "production";
  }
  process.exitCode = await runShard("focused selection");
} else {
  if (mode !== "preview") {
    const buildCode = await buildProductionAudit();
    if (buildCode !== 0) throw new Error("v9 UAT production build failed; route shards were not started.");
    baseEnv.PLAYWRIGHT_SERVER_MODE = "production";
  }
  const require = createRequire(import.meta.url);
  const { discoverRouteMatrix, roles, viewports } = require("../../tests/e2e/v9-route-matrix.cjs");
  const matrix = discoverRouteMatrix();
  const appRoutes = matrix.filter((entry) => !entry.public).map((entry) => entry.route);
  const publicRoutes = matrix.filter((entry) => entry.public).map((entry) => entry.route);
  const parsedBatchSize = Number.parseInt(process.env.V9_UAT_ROUTE_BATCH_SIZE || "50", 10);
  if (!Number.isInteger(parsedBatchSize) || parsedBatchSize < 1 || parsedBatchSize > 60) {
    throw new Error("V9_UAT_ROUTE_BATCH_SIZE must be an integer between 1 and 60.");
  }
  const routeBatches = [];
  for (let index = 0; index < appRoutes.length; index += parsedBatchSize) {
    routeBatches.push(appRoutes.slice(index, index + parsedBatchSize));
  }

  let failedShards = 0;
  let completedShards = 0;
  const totalShards = roles.length * viewports.length * routeBatches.length + viewports.length;
  for (const role of roles) {
    for (const viewport of viewports) {
      for (let batchIndex = 0; batchIndex < routeBatches.length; batchIndex += 1) {
        const label = `${role} · ${viewport.label} · app batch ${batchIndex + 1}/${routeBatches.length}`;
        const code = await runShard(label, {
          V9_UAT_ROLES: role,
          V9_UAT_VIEWPORTS: viewport.label,
          V9_UAT_ROUTES: routeBatches[batchIndex].join(","),
          V9_UAT_SURFACE: "app",
        });
        completedShards += 1;
        if (code !== 0) failedShards += 1;
        console.log(`[v9 UAT] shard ${completedShards}/${totalShards} ${code === 0 ? "passed" : "failed"}`);
      }
    }
  }
  for (const viewport of viewports) {
    const code = await runShard(`public · ${viewport.label}`, {
      V9_UAT_VIEWPORTS: viewport.label,
      V9_UAT_ROUTES: publicRoutes.join(","),
      V9_UAT_SURFACE: "public",
    });
    completedShards += 1;
    if (code !== 0) failedShards += 1;
    console.log(`[v9 UAT] shard ${completedShards}/${totalShards} ${code === 0 ? "passed" : "failed"}`);
  }
  console.log(`[v9 UAT] ${completedShards - failedShards}/${completedShards} shards passed.`);
  process.exitCode = failedShards === 0 ? 0 : 1;
}
