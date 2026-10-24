const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const sql = read("supabase/migrations/061_ap_aging_report.sql");

test("AP aging boundaries and exclusions are database authoritative", () => {
  assert.match(sql, /si\.status in \('open','partially_paid'\)/);
  assert.match(sql, /si\.due_date > report_date then 'not_due'/);
  assert.match(sql, /si\.due_date = report_date then 'due_today'/);
  assert.match(sql, /between 1 and 30/);
  assert.match(sql, /between 31 and 60/);
  assert.match(sql, /between 61 and 90/);
  assert.match(sql, /else 'overdue_90_plus'/);
  assert.match(sql, /si\.due_date is null then 'missing_due_date'/);
  assert.match(sql, /greatest\(round\(si\.total_amount-coalesce\(pt\.amount_paid, 0\), 2\), 0\)/);
  const includedStatuses = sql.match(/si\.status in \(([^)]*)\)/)?.[1] ?? "";
  assert.doesNotMatch(includedStatuses, /'draft'|'paid'|'void'/);
});

test("AP aging aggregates payments, suppliers, currency and due-next-seven server-side", () => {
  assert.match(sql, /sum\(amount\)/);
  assert.match(sql, /group by supplier_invoice_id/);
  assert.match(sql, /supplier_name,count\(\*\) invoice_count/);
  assert.match(sql, /due_date>report_date and due_date<=report_date\+7/);
  assert.match(sql, /'MYR'::text currency/);
  assert.match(sql, /company_id=actor\.company_id/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public/);
});

test("AP aging UI and CSV share URL filters and server report", () => {
  const query = read("src/server/queries/ap-aging.ts");
  const page = read("src/app/(app)/supplier-invoices/aging/page.tsx");
  const csv = read("src/app/api/export/ap-aging/route.ts");
  assert.match(query, /get_ap_aging_report/);
  for (const filter of ["p_search", "p_supplier_id", "p_bucket", "p_status", "p_due_from", "p_due_to", "p_overdue_only"]) assert.match(query, new RegExp(filter));
  assert.match(page, /PaginationControls/);
  assert.match(page, /Missing Due Date/);
  assert.match(page, /days overdue/);
  assert.match(csv, /getCompleteApAgingReport\(params(?:,\s*\{[^}]+\})?\)/);
  assert.match(query, /rows\.length < report\.total_rows/);
  assert.match(csv, /ap-aging-\$\{report\.report_date\}\.csv/);
  assert.doesNotMatch(sql, /(insert|update|delete)\s+(into\s+)?public\.(stock_transactions|stock_transaction_lines|stock_balances)/i);
});

test("AP aging replaces narrow financial tables with complete decision lists", () => {
  const page = read("src/app/(app)/supplier-invoices/aging/page.tsx");
  assert.match(page, /<Table mobileHidden aria-label="Supplier payable exposure">/);
  assert.match(page, /data-ap-aging-supplier-list/);
  assert.match(page, /!report\.suppliers\.length \? <EmptyState title="No supplier exposure"/);
  assert.match(page, /<Table mobileHidden aria-label="AP aging invoice detail">/);
  assert.match(page, /data-ap-aging-invoice-list/);
  for (const authority of ["total_outstanding", "overdue_outstanding", "oldest_due_date", "maximum_days_overdue", "original_total", "amount_paid", "outstanding", "aging_bucket", "alert_severity", "due_date"]) {
    assert.match(page, new RegExp(`row\\.${authority}`));
  }
});

test("AP aging uses the shared balanced query surface", () => {
  const page = read("src/app/(app)/supplier-invoices/aging/page.tsx");
  assert.match(page, /<FilterBar resultCount=\{report\.total_rows\} resetHref="\/supplier-invoices\/aging"/);
  assert.match(page, /className="sb-list-filters--balanced"/);
  assert.match(page, /<FilterBarMore activeCount=\{activeFilterCount\}/);
  assert.doesNotMatch(page, /<form className="sb-list-filters sb-list-query-card sb-list-filters--dense">/);
  for (const label of ["Search invoices", "Supplier", "Aging bucket", "Invoice status", "Due date from", "Due date to"]) {
    assert.match(page, new RegExp(`(?:ariaLabel|aria-label)="${label}"`));
  }
});
