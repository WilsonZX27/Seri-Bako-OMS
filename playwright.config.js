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

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  outputDir: "test-results/ui-smoke-sprint-7-2-4-artifacts",
  use: {
    baseURL: process.env.TEST_BASE_URL || "https://seri-bako-oms-official.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
