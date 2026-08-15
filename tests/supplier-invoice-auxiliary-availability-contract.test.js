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
