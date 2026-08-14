const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "outlet-daily-records", "page.tsx"), "utf8");
const chart = fs.readFileSync(path.join(root, "src", "components", "outlet-daily-wastage-chart.tsx"), "utf8");
const permissions = fs.readFileSync(path.join(root, "src", "server", "auth", "permissions.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "147_purchasing_manage_outlet_daily_records.sql"), "utf8");

test("outlet daily workspace renders a lightweight 30-day completed-record wastage trend", () => {
  assert.match(page, /getOutletDailyDemandTrend\(\{ period: "30", branch: filters\.branch \}\)/);
  assert.match(page, /<OutletDailyWastageChart points=\{trend\.daily\} \/>/);
  assert.match(chart, /Completed outlet records only/);
  assert.match(chart, /wastage ÷ received/);
  assert.match(chart, /<svg/);
  assert.match(chart, /maximumFractionDigits: 1/);
  assert.match(chart, /left: 54/);
  assert.doesNotMatch(chart, /"use client"|recharts|chart\.js|d3/);
});

test("purchasing can inspect and correct company outlet daily records without bypassing RLS", () => {
  const required = ["view", "view_all", "update", "qty_sent"];
  for (const action of required) {
    const code = `outlet_daily_record.${action}`;
    assert.match(permissions, new RegExp(`"${code.replace(".", "\\.")}"`));
    assert.match(migration, new RegExp(`'${code.replace(".", "\\.")}'`));
  }
  assert.match(migration, /r\.role_code = 'purchasing'/);
  assert.match(migration, /r\.company_id is not null/);
  assert.match(migration, /on conflict \(role_id, permission_id\) do nothing/);
  assert.doesNotMatch(migration, /outlet_daily_record\.create/);
  assert.doesNotMatch(migration, /alter table|disable row level security|security definer/i);
});
