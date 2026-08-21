const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("shared list controls swap Search and Reset and wrap narrow counts", () => {
  const header = read("src", "components", "common", "UnifiedListHeader.tsx");
  const css = read("src", "app", "design-system-v2.css");
  assert.match(header, /filtered && resetAction/);
  assert.match(header, /sb-filter-summary-count/);
  assert.match(header, /sb-filter-summary-label/);
  assert.match(css, /\.sb-filter-summary/);
});

test("supplier identity keeps short name separate from formal AutoCount identity", () => {
  const schema = read("src", "lib", "validations", "supplier.ts");
  const form = read("src", "components", "supplier-form.tsx");
  const list = read("src", "app", "(app)", "suppliers", "page.tsx");
  assert.match(schema, /supplier_group/);
  assert.match(form, /Item Group \/ Short Name/);
  assert.match(list, /AutoCount code missing/);
  assert.match(list, /supplier\.supplier_group/);
});

test("supplier-item mapping searches items while Item Master owns Base UOM", () => {
  const form = read("src", "components", "master-data-forms.tsx");
  assert.match(form, /ItemCombobox/);
  assert.match(form, /brand_name/);
  assert.match(form, /Base UOM/);
  assert.match(form, /Open Item Master/);
  assert.doesNotMatch(form, /name="base_uom"/);
});

test("item-code order is natural before pagination with a stable tie-breaker", () => {
  const query = read("src", "server", "queries", "items.ts");
  const migration = read("supabase", "migrations", "183_natural_item_code_sort.sql");
  assert.match(query, /sort: filters\.sort \?\? "item_code"/);
  assert.match(query, /compareTableValues/);
  assert.match(query, /compareTableValues\(a\.id, b\.id, "asc"\)/);
  assert.match(migration, /natural_sort_key/);
  assert.match(migration, /public\.natural_sort_key\(item_code\)/);
});

test("purchase request number order is natural before pagination", () => {
  const query = read("src", "server", "queries", "procurement.ts");
  const migration = read("supabase", "migrations", "184_natural_purchase_request_number_sort.sql");
  assert.match(query, /sort === "request_no" \? "request_sort_key" : sort/);
  assert.match(query, /\.order\(databaseSort, \{ ascending \}\)[\s\S]{0,100}\.order\("id", \{ ascending \}\)/);
  assert.match(migration, /generated always as \(public\.natural_sort_key\(request_no\)\) stored/);
  assert.match(migration, /company_id, request_sort_key, id/);
});

test("procurement removes duplicate controls and uses useful summaries", () => {
  const po = read("src", "components", "procurement-forms.tsx");
  const detail = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  const stock = read("src", "components", "stock-balance-workspace.tsx");
  assert.doesNotMatch(po, /Add only the items included in this order/);
  assert.match(po, /detailsOpen/);
  assert.match(detail, /Requested Lines/);
  assert.match(detail, /Est\. Total Cost/);
  assert.doesNotMatch(stock, /Different suppliers will be split|Saved on this device/);
});

test("outlet history distinguishes missing sent data and unavailable percentages", () => {
  const page = read("src", "app", "(app)", "outlet-daily-records", "page.tsx");
  const query = read("src", "server", "queries", "outlet-daily-records.ts");
  const matrix = read("src", "components", "outlet-daily-completion-matrix.tsx");
  assert.match(page, /history_date/);
  assert.match(page, /Qty sent state/);
  assert.match(page, /canViewSentGaps/);
  assert.match(query, /qty_sent_state/);
  assert.match(query, /sent_state === "missing"/);
  assert.match(matrix, /completionPercent === null \? "Not available"/);
});

test("neutral analytics do not use warning gold", () => {
  const chart = read("src", "components", "reports", "inventory-daily-movement-chart.tsx");
  const procurement = read("src", "app", "(app)", "procurement", "page.tsx");
  assert.doesNotMatch(chart, /Outbound entries[\s\S]{0,700}sb-warning/);
  assert.match(chart, /fill="var\(--sb-text-muted\)"/);
  assert.doesNotMatch(procurement, /counter\.value !== null && counter\.value > 0/);
});

test("release documents and footer share the current v8.64.111 patch", () => {
  assert.match(read("src", "lib", "app-version.ts"), /8\.64\.111/);
  assert.match(read("PRODUCT.md"), /v8\.64\.111/);
  assert.match(read("DESIGN.md"), /v8\.64\.111/);
  assert.match(read("docs", "ANNOTATION-REPAIR-LEDGER-2026-08-19.md"), /31-comment register/);
});

test("PO and production portrait-tablet layouts keep deliberate alignment", () => {
  const po = read("src", "components", "procurement-forms.tsx");
  const jobs = read("src", "app", "(app)", "production", "jobs", "page.tsx");
  const css = read("src", "app", "design-system-v2.css");
  assert.match(po, /<input hidden type="hidden" name="po_no"/);
  assert.match(po, /id="purchase-order-form"[^>]+className="grid gap-3"/);
  assert.match(jobs, /sb-production-jobs-filters/);
  assert.match(css, /sb-production-jobs-filters[\s\S]{0,300}repeat\(3, minmax\(0, 1fr\)\)/);
});

test("typed PR item codes cannot bypass the selected sourcing catalogue", () => {
  const form = read("src", "components", "procurement-forms.tsx");
  const combobox = read("src", "components", "item-combobox.tsx");
  assert.match(form, /selectableItems\.find\(\(item\) => item\.id === value\)/);
  assert.doesNotMatch(form, /const selected =[\s\S]{0,100}items\.find\(\(item\) => item\.id === value\)/);
  assert.match(combobox, /event\.key === "ArrowDown"/);
  assert.match(combobox, /aria-activedescendant/);
  assert.match(combobox, /Supplier · \{item\.supplier_name\}/);
  assert.match(combobox, /Purchase \{\(item\.purchase_unit \|\| item\.base_unit\)/);
});

test("undefined Outlet rates stay unavailable and out of the trend", () => {
  const query = read("src", "server", "queries", "outlet-daily-records.ts");
  assert.match(query, /wastage_percent: totalReceived !== null && totalReceived > 0[^\n]+: null/);
  assert.match(query, /filter\(\(row\) => row\.received > 0\)/);
});
