const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const sql = read("supabase/migrations/062_payment_due_alerts.sql");

function classify(daysOverdue, daysUntilDue, missing = false) {
  if (missing) return "data_quality";
  if (daysOverdue > 90) return "critical";
  if (daysOverdue > 0) return "overdue";
  if (daysUntilDue === 0) return "due_today";
  if (daysUntilDue <= 7) return "due_soon";
  return null;
}

test("payment alert boundaries and financial-open exclusions stay aligned with AP Aging", () => {
  assert.equal(classify(0, 0, true), "data_quality");
  assert.equal(classify(0, 0), "due_today");
  assert.equal(classify(0, 1), "due_soon");
  assert.equal(classify(0, 7), "due_soon");
  assert.equal(classify(0, 8), null);
  for (const days of [1, 30, 31, 90]) assert.equal(classify(days, 0), "overdue");
  assert.equal(classify(91, 0), "critical");
  assert.match(sql, /si\.status in \('open','partially_paid'\)/);
  assert.match(sql, /greatest\(round\(si\.total_amount-coalesce\(pt\.amount_paid, 0\), 2\), 0\) > 0/);
  assert.match(sql, /when days_overdue > 90 then 'critical'/);
  assert.match(sql, /due_date between report_date\+1 and report_date\+7 then 6/);
});

test("attention aggregation is prioritized, company-scoped and permission-gated", () => {
  assert.match(sql, /when due_date is null then 1/);
  assert.match(sql, /when days_overdue > 90 then 2/);
  assert.match(sql, /between 31 and 90 then 3/);
  assert.match(sql, /between 1 and 30 then 4/);
  assert.match(sql, /due_date = report_date then 5/);
  assert.match(sql, /order by alert_priority, outstanding desc, due_date asc nulls first/);
  assert.match(sql, /company_id=actor\.company_id/);
  assert.match(sql, /has_permission\('supplier_invoice\.view'\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /'MYR'::text currency/);
  assert.doesNotMatch(sql, /(insert|update|delete)\s+(into\s+|from\s+)?public\.(supplier_invoices|supplier_invoice_payments|stock_transactions|stock_balances)/i);
});

test("dashboard, AP Aging and invoice detail use the shared live report without bell integration", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const query = read("src/server/queries/ap-aging.ts");
  const detail = read("src/app/(app)/supplier-invoices/[id]/page.tsx");
  const aging = read("src/app/(app)/supplier-invoices/aging/page.tsx");
  const topbar = read("src/server/queries/topbar.ts");
  assert.match(query, /getPayablesAttention/);
  assert.match(query, /getApAgingReport\(\)/);
  assert.match(detail, /getApAgingReport\(\{ search: invoice\.invoice_no \}\)/);
  for (const href of ["bucket=missing_due_date", "bucket=overdue_90_plus", "overdue=1", "bucket=due_today", "due_from="]) assert.match(dashboard + aging, new RegExp(href));
  assert.match(aging, /row\.alert_label/);
  assert.doesNotMatch(topbar, /PayablesAttention|getApAgingReport/);
});
