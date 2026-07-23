const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("migration 063 removes the nonexistent supplier company column and keeps invoice company isolation", () => {
  const suppliers = read("supabase/migrations/001_milestone_1_inventory_foundation.sql");
  const prior = read("supabase/migrations/062_payment_due_alerts.sql");
  const fix = read("supabase/migrations/063_fix_ap_aging_runtime.sql");
  const supplierTable = suppliers.match(/create table if not exists public\.suppliers \([\s\S]*?\n\);/)?.[0] ?? "";
  assert.doesNotMatch(supplierTable, /company_id/);
  assert.match(prior, /s\.company_id=actor\.company_id/);
  assert.match(fix, /join public\.suppliers s on s\.id=si\.supplier_id\s/);
  assert.doesNotMatch(fix, /s\.company_id=actor\.company_id/);
  assert.match(fix, /si\.company_id=actor\.company_id/);
  assert.match(fix, /supplier_invoice_payments[\s\S]*company_id=actor\.company_id/);
  assert.doesNotMatch(fix, /(insert|update|delete)\s+(into\s+|from\s+)?public\.(supplier_invoices|supplier_invoice_payments|suppliers|stock_transactions|stock_balances)/i);
});

test("dashboard isolates AP failure and user-facing errors stay generic", () => {
  const query = read("src/server/queries/dashboard.ts");
  const workspace = read("src/components/dashboard-workspace.tsx");
  const errorPage = read("src/app/(app)/supplier-invoices/aging/error.tsx");
  const apQuery = read("src/server/queries/ap-aging.ts");
  assert.match(query, /try \{[\s\S]*getPayablesAttention\(\)[\s\S]*catch \{/);
  assert.match(query, /payablesAttentionUnavailable = true/);
  assert.match(workspace, /payablesAttentionUnavailable/);
  assert.match(workspace, /operational queues remain current/);
  assert.match(errorPage, /temporarily unavailable\. Please retry or contact the Super Admin \/ Owner/);
  assert.match(apQuery, /logServerError\(error, \{ source: "ap-aging\.getApAgingReport" \}\)/);
  assert.match(apQuery, /throw new Error\("AP Aging report is unavailable\."\)/);
});

test("release footer follows the current sprint baseline", () => {
  const version = read("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "7\.23\.7\.0"/);
  assert.match(version, /APP_SPRINT = "v7\.23\.7\.0"/);
});

