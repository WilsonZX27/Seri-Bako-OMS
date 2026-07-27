const fs = require("fs");
const path = require("path");
const { defineConfig } = require("@playwright/test");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, ".env.test.local"));

const localPort = process.env.PLAYWRIGHT_LOCAL_PORT || "3000";
const localBaseUrl = `http://127.0.0.1:${localPort}`;
const startsLocalServer = process.env.RUN_TENANT_BOUNDARY_E2E === "1" && process.env.PW_MANUAL_SERVER !== "1";
const baseURL = process.env.TEST_BASE_URL || (startsLocalServer ? localBaseUrl : "");

if (!baseURL) {
  throw new Error("E2E is fail-closed: set TEST_BASE_URL to an isolated target, or set RUN_TENANT_BOUNDARY_E2E=1 for the local test server.");
}

const target = new URL(baseURL);
if (!["127.0.0.1", "localhost"].includes(target.hostname) && process.env.ALLOW_REMOTE_E2E !== "1") {
  throw new Error("Remote E2E is blocked by default. Set ALLOW_REMOTE_E2E=1 only for an explicitly approved non-production target.");
}

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  outputDir: "test-results/ui-smoke-sprint-7-2-6-artifacts",
  webServer: startsLocalServer ? {
    command: "node scripts/playwright-local-server.mjs",
    url: `${localBaseUrl}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  } : undefined,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
