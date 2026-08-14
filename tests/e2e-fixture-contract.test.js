const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("local Playwright role fixtures are explicit, disposable, and never enabled for remote targets", () => {
  const config = read("playwright.config.js");
  const setup = read("tests/e2e/local-role-fixture-global-setup.cjs");
  const seed = read("scripts/setup-local-dashboard-e2e.mjs");

  assert.match(config, /usesLocalRoleFixture\s*=\s*process\.env\.RUN_TENANT_BOUNDARY_E2E\s*===\s*["']1["']/);
  assert.match(config, /globalSetup:\s*usesLocalRoleFixture/);
  assert.match(config, /baseURL\s*=\s*startsLocalServer\s*\?\s*localBaseUrl\s*:/);
  assert.match(setup, /RUN_TENANT_BOUNDARY_E2E\s*!==\s*["']1["']/);
  assert.match(seed, /auth\.admin\.updateUserById/);
  assert.match(seed, /auth\.admin\.createUser/);
  assert.match(seed, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.doesNotMatch(seed, /execFileSync/);
  assert.match(seed, /process\.env\.E2E_STOCK_COUNT_FIXTURE\s*===\s*["']1["']/);
});

test("interactive-bound audits ignore only non-operable headless form mirrors", () => {
  const audit = read("tests/e2e/static-workspace-layout-audit.spec.js");

  assert.match(audit, /getAttribute\("aria-hidden"\) === "true"/);
  assert.match(audit, /style\.pointerEvents === "none" && node\.tabIndex < 0/);
});
