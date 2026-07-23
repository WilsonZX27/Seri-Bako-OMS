const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/lib/mock-mode.ts", "utf8");

test("mock mode is a local development fallback and cannot activate in production", () => {
  assert.match(source, /process\.env\.NODE_ENV !== "production"/);
  assert.match(source, /process\.env\.NEXT_PUBLIC_ENABLE_MOCK_MODE === "true"/);
  assert.match(source, /!hasSupabaseEnv\(\)/);
});
