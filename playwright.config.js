const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.TEST_BASE_URL || "https://seri-bako-oms-official.vercel.app",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
