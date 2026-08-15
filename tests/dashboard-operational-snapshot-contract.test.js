const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("dashboard does not compute operational trends or production queues on the initial request", () => {
  const source = read("src/server/queries/dashboard.ts");
  assert.doesNotMatch(source, /getOperationsControlCenterSummary/);
  assert.doesNotMatch(source, /getProductionHubSummary/);
  assert.match(source, /get_dashboard_core_snapshot/);
  assert.match(source, /coreSnapshot\?\.outlet_missing_evening/);
  assert.doesNotMatch(read("src/components/dashboard-workspace.tsx"), /outlet\.needs_review/);
  assert.match(source, /coreSnapshot\?\.production_pending_approval/);
});

test("dashboard snapshot contains bounded operational counters", () => {
  const migration = read("supabase/migrations/134_dashboard_operational_snapshot.sql");
  for (const key of [
    "production_today_posted",
    "production_pending_approval",
    "production_ready_to_post",
    "production_ingredient_shortages",
    "outlet_missing_evening",
    "outlet_needs_review",
  ]) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.doesNotMatch(migration, /stock_ledger_view/);
});
