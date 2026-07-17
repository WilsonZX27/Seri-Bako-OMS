const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const sql = read("supabase/migrations/063_fix_ap_aging_runtime.sql");
const query = read("src/server/queries/ap-aging.ts");
const page = read("src/app/(app)/supplier-invoices/cash-flow/page.tsx");

test("cash flow forecast reuses the AP Aging payable balance source", () => {
  assert.match(query, /getCompleteApAgingReport\(\)/);
  assert.match(query, /getApAgingReport\(\{ \.\.\.filters, page: "1" \}, true\)/);
  assert.match(sql, /si\.status in \('open','partially_paid'\)/);
  assert.match(sql, /greatest\(round\(si\.total_amount-coalesce\(pt\.amount_paid, 0\), 2\), 0\) > 0/);
  const includedStatuses = sql.match(/si\.status in \(([^)]*)\)/)?.[1] ?? "";
  assert.doesNotMatch(includedStatuses, /'draft'|'paid'|'void'/);
});

test("forecast separates overdue, future and missing due-date pressure", () => {
  assert.match(query, /row\.due_date! < report\.report_date/);
  assert.match(query, /row\.due_date! >= report\.report_date && row\.due_date! <= periodEnd/);
  assert.match(query, /const missingDueDate = report\.rows\.filter\(\(row\) => !row\.due_date\)/);
  for (const key of ["total_due_in_period", "overdue_brought_forward", "due_today", "due_this_week", "due_next_week", "missing_due_date_exposure"]) assert.match(query, new RegExp(key));
  assert.match(page, /Overdue Brought Forward/);
  assert.match(page, /Missing Due Date Exposure/);
});

test("forecast supports every requested horizon and top supplier aggregation", () => {
  assert.match(query, /"7" \| "14" \| "30" \| "month"/);
  assert.match(query, /period === "month" \? monthEnd\(report\.report_date\) : shiftDate/);
  assert.match(query, /supplierTotals\.get\(row\.supplier_id\)/);
  assert.match(query, /sort\(\(left, right\) => right\.amount - left\.amount/);
  for (const label of ["7 Days", "14 Days", "30 Days", "Current Month", "Top Suppliers in Selected Period", "Invoice Forecast Detail"]) assert.match(page, new RegExp(label));
});

test("forecast keeps AP permission, company and timezone authority without supplier company assumptions", () => {
  assert.match(sql, /auth_user_id=auth\.uid\(\) and status='active'/);
  assert.match(sql, /has_permission\('supplier_invoice\.view'\)/);
  assert.match(sql, /si\.company_id=actor\.company_id/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /Asia\/Kuala_Lumpur/);
  assert.doesNotMatch(sql, /join public\.suppliers s on[^\n]*s\.company_id/);
  assert.match(page, /MYR only under the current schema/);
  assert.equal(fs.existsSync("supabase/migrations/064_cash_flow_forecast.sql"), false);
});

test("cash flow route has operational entry points, pagination and isolated states", () => {
  const invoiceList = read("src/app/(app)/supplier-invoices/page.tsx");
  const agingPage = read("src/app/(app)/supplier-invoices/aging/page.tsx");
  const errorPage = read("src/app/(app)/supplier-invoices/cash-flow/error.tsx");
  const loadingPage = read("src/app/(app)/supplier-invoices/cash-flow/loading.tsx");
  assert.match(invoiceList, /supplier-invoices\/cash-flow/);
  assert.match(agingPage, /supplier-invoices\/cash-flow/);
  assert.match(page, /PaginationControls/);
  assert.match(page, /Open and Partially Paid/);
  assert.match(errorPage, /Cash Flow Forecast is unavailable/);
  assert.match(loadingPage, /aria-busy="true"/);
});

test("release footer follows the current sprint baseline", () => {
  const version = read("src/lib/app-version.ts");
  assert.match(version, /APP_VERSION = "0\.2\.25"/);
  assert.match(version, /APP_SPRINT = "Sprint 7\.17\.2"/);
});
