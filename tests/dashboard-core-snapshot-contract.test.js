const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const dashboard = fs.readFileSync(path.join(root, "src/server/queries/dashboard.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/132_dashboard_core_snapshot.sql"), "utf8");

test("dashboard core counters and recent records use one snapshot RPC", () => {
  assert.match(dashboard, /rpc\("get_dashboard_core_snapshot"/);
  assert.match(dashboard, /getDashboardCoreSnapshotFallback/);
  assert.match(dashboard, /coreSnapshotUnavailable/);
});

test("dashboard snapshot preserves RLS and returns bounded recent collections", () => {
  assert.match(migration, /security invoker/i);
  assert.match(migration, /limit 5/g);
  assert.match(migration, /limit 6/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /security definer/i);
});

test("dashboard fallback never treats incomplete counts or rows as verified zero", () => {
  assert.match(dashboard, /result\.count === null \? null/);
  assert.match(dashboard, /balances\.count === null/);
  assert.match(dashboard, /urgentRequests\.data === null/);
  assert.match(dashboard, /lowStockViewUnavailable = Boolean/);
});
