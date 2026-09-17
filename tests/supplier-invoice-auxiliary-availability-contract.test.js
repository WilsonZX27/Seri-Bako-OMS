const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("supplier filter reads fail explicitly instead of returning a false empty list", () => {
  const query = read("src", "server", "queries", "supplier-invoices.ts");
  const body = query.match(/export async function getSupplierInvoiceFilterSuppliers\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(body, /invoicesError/);
  assert.match(body, /if \(invoicesError\) throw new Error/);
  assert.match(body, /if \(error\) throw new Error/);
});

test("supplier invoice queue isolates summary and supplier-filter failures", () => {
  const page = read("src", "app", "(app)", "supplier-invoices", "page.tsx");

  assert.match(page, /Promise\.allSettled\(\[getSupplierInvoiceSummary\(\), getSupplierInvoiceFilterSuppliers\(\)\]\)/);
  assert.match(page, /page\.supplierInvoices\.summary/);
  assert.match(page, /page\.supplierInvoices\.supplierFilter/);
  assert.match(page, /The invoice queue remains current/);
  assert.match(page, /Supplier filter unavailable/);
  assert.match(page, /!suppliers && filters\.supplier[\s\S]*type="hidden" name="supplier"/);
});

test("supplier invoice queue summary uses a constant-size aggregate boundary", () => {
  const query = read("src", "server", "queries", "supplier-invoices.ts");
  const migration = read("supabase", "migrations", "303_supplier_invoice_queue_summary.sql");
  const verification = read("supabase", "verification", "production_migration_303_readonly.sql");
  const body = query.match(/export async function getSupplierInvoiceSummary\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(body, /rpc\("get_supplier_invoice_queue_summary"\)\.single\(\)/);
  assert.doesNotMatch(body, /getApAgingReport/);
  assert.match(migration, /payment\.company_id = actor\.company_id/);
  assert.match(migration, /invoice\.company_id = actor\.company_id/);
  assert.match(migration, /public\.has_permission\('supplier_invoice\.view'\)/);
  assert.match(migration, /revoke all on function public\.get_supplier_invoice_queue_summary\(\) from public, anon/);
  assert.match(migration, /grant execute on function public\.get_supplier_invoice_queue_summary\(\) to authenticated/);
  assert.match(verification, /version = '303'/);
  assert.match(verification, /authenticated_execute/);
  assert.match(verification, /anon_execute/);
  assert.doesNotMatch(verification, /\b(insert|update|delete|alter|drop|create|grant|revoke)\b/i);
});
