const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("Activity navigation is authorized for every role that can see it", () => {
  const routes = read("src/server/auth/route-permissions.ts");
  assert.match(routes, /"\/activity": \["dashboard\.view"\]/);
});

test("transfer and wastage terminal transitions are database-owned and atomic", () => {
  const actions = read("src/server/actions/stock-operations.ts");
  const migration = read("supabase/migrations/092_stock_operation_terminal_transition_atomicity.sql");

  assert.match(actions, /rpc\("transition_stock_transfer_terminal_atomic"/);
  assert.match(actions, /rpc\("transition_stock_wastage_terminal_atomic"/);
  assert.doesNotMatch(actions, /from\("stock_wastage"\)\.update\(\{ status \}/);
  assert.match(migration, /create or replace function public\.transition_stock_transfer_terminal_atomic/);
  assert.match(migration, /create or replace function public\.transition_stock_wastage_terminal_atomic/);
  assert.match(migration, /for update/);
  assert.match(migration, /status not in \('draft', 'in_transit'\)/);
  assert.match(migration, /status not in \('draft', 'approved'\)/);
  assert.match(migration, /grant execute on function public\.transition_stock_transfer_terminal_atomic/);
});

test("browser E2E cannot silently target a remote environment", () => {
  const config = read("playwright.config.js");
  assert.match(config, /E2E is fail-closed/);
  assert.match(config, /ALLOW_REMOTE_E2E !== "1"/);
  assert.match(config, /RUN_TENANT_BOUNDARY_E2E === "1"/);
  const localServer = read("scripts/playwright-local-server.mjs");
  assert.match(localServer, /const app = next\(\{ dev: !production/);
  assert.match(localServer, /const hostname = "localhost"/);
  assert.match(localServer, /PLAYWRIGHT_SERVER_SHUTDOWN_TOKEN/);
  assert.doesNotMatch(localServer, /taskkill|spawn\(/);
});
