const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const config = fs.readFileSync(path.join(root, "playwright.config.js"), "utf8");
const server = fs.readFileSync(path.join(root, "scripts", "playwright-local-server.mjs"), "utf8");
const runner = fs.readFileSync(path.join(root, "scripts", "v9", "run-uat.mjs"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const stopLocalServer = require("./e2e/local-server-global-teardown.cjs");

test("v9 local UAT owns an isolated server and closes it before Playwright webServer teardown", () => {
  assert.match(config, /globalTeardown:\s*startsLocalServer/);
  assert.match(config, /PLAYWRIGHT_SERVER_SHUTDOWN_TOKEN\s*=\s*randomUUID\(\)/);
  assert.match(config, /reuseExistingServer:\s*false/);
  assert.doesNotMatch(config, /gracefulShutdown/);
  assert.match(server, /hostname\s*=\s*"localhost"/);
  assert.match(config, /localBaseUrl = `http:\/\/localhost:\$\{localPort\}`/);
  assert.match(stopLocalServer.toString(), /http:\/\/localhost:/);
  assert.match(server, /timingSafeEqual/);
  assert.match(server, /await closeHttpServer\(\)/);
  assert.match(server, /await app\.close\(\)/);
  assert.match(server, /PLAYWRIGHT_SERVER_MODE/);
  assert.match(server, /next\(\{ dev: !production/);
  assert.doesNotMatch(server, /taskkill|spawn\(/);
});

test("v9 package commands set the explicit mode and local fixture guards", () => {
  assert.equal(packageJson.scripts["uat:env:prepare"], "node scripts/v9/prepare-local-uat-env.mjs");
  assert.equal(packageJson.scripts["uat:v9:local"], "node scripts/v9/run-uat.mjs local");
  assert.equal(packageJson.scripts["uat:v9:full"], "node scripts/v9/run-uat.mjs full");
  assert.equal(packageJson.scripts["uat:v9:preview"], "node scripts/v9/run-uat.mjs preview --env .env.preview.test.local");
  assert.match(runner, /mode === "preview"/);
  assert.match(runner, /check-uat-environment\.mjs/);
  assert.match(runner, /no browser shard was started/);
  assert.match(runner, /RUN_TENANT_BOUNDARY_E2E:\s*"1"/);
  assert.match(runner, /RUN_V9_FULL_UAT/);
  assert.match(runner, /RUN_V9_LOCAL_UAT/);
  assert.match(runner, /PLAYWRIGHT_LOCAL_PORT:[\s\S]*"3109"/);
  assert.match(runner, /V9_UAT_ROUTE_BATCH_SIZE/);
  assert.match(runner, /V9_UAT_SURFACE: "app"/);
  assert.match(runner, /V9_UAT_SURFACE: "public"/);
  assert.match(runner, /failedShards === 0 \? 0 : 1/);
  assert.match(runner, /building isolated production audit target/);
  assert.match(runner, /NEXT_DIST_DIR: "\.next-playwright-production"/);
  assert.match(runner, /baseEnv\.PLAYWRIGHT_SERVER_MODE = "production"/);
  assert.match(runner, /V9_UAT_REBUILD === "1"/);
});

test("controlled teardown authenticates the request and waits for the local server to close", async () => {
  let authorization = "";
  let shutdownRequests = 0;
  const originalFetch = global.fetch;
  const port = "43129";
  const previous = {
    boundary: process.env.RUN_TENANT_BOUNDARY_E2E,
    manual: process.env.PW_MANUAL_SERVER,
    port: process.env.PLAYWRIGHT_LOCAL_PORT,
    token: process.env.PLAYWRIGHT_SERVER_SHUTDOWN_TOKEN,
  };
  process.env.RUN_TENANT_BOUNDARY_E2E = "1";
  delete process.env.PW_MANUAL_SERVER;
  process.env.PLAYWRIGHT_LOCAL_PORT = String(port);
  process.env.PLAYWRIGHT_SERVER_SHUTDOWN_TOKEN = "test-shutdown-token";
  global.fetch = async (url, options = {}) => {
    if (options.method === "POST") {
      authorization = new Headers(options.headers).get("authorization") || "";
      shutdownRequests += 1;
      return new Response("Shutting down", { status: 202 });
    }
    throw new Error("Server closed");
  };
  try {
    await stopLocalServer();
    assert.equal(authorization, "Bearer test-shutdown-token");
    assert.equal(shutdownRequests, 1);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      const envKey = { boundary: "RUN_TENANT_BOUNDARY_E2E", manual: "PW_MANUAL_SERVER", port: "PLAYWRIGHT_LOCAL_PORT", token: "PLAYWRIGHT_SERVER_SHUTDOWN_TOKEN" }[key];
      if (value === undefined) delete process.env[envKey];
      else process.env[envKey] = value;
    }
  }
});
