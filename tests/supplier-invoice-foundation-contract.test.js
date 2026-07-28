const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/060_supplier_invoice_payment_foundation.sql"), "utf8");
const actions = fs.readFileSync(path.join(root, "src/server/actions/supplier-invoices.ts"), "utf8");
const form = fs.readFileSync(path.join(root, "src/components/supplier-invoice-form.tsx"), "utf8");
const validation = fs.readFileSync(path.join(root, "src/lib/validations/procurement.ts"), "utf8");

test("invoice matching integrity is database-authoritative", () => {
  assert.match(migration, /company_supplier_reference_idx/);
  assert.match(migration, /Cross-company GRN selection is not allowed/);
  assert.match(migration, /All selected GRNs must belong to the selected supplier/);
  assert.match(migration, /previously_invoiced_qty/);
  assert.match(migration, /Invoice quantity exceeds the uninvoiced received quantity/);
  assert.match(migration, /subtotal_value := subtotal_value \+ round\(input_line\.invoice_qty \* input_line\.invoice_unit_price, 2\)/);
  assert.match(form, /Qty \/ Price Variance/);
});

test("payment and workflow transitions are atomic and idempotent", () => {
  assert.match(migration, /for update/);
  assert.match(migration, /supplier_invoice_payments_idempotency_idx/);
  assert.match(migration, /new_paid > invoice\.total_amount/);
  assert.match(migration, /when new_paid=total_amount then 'paid' else 'partially_paid'/);
  assert.match(migration, /Only draft invoices can be approved/);
  assert.match(migration, /Paid invoices cannot be voided/);
  assert.match(actions, /record_supplier_invoice_payment/);
});

test("invoice and payment actions never write inventory", () => {
  assert.doesNotMatch(migration, /insert into public\.(stock_transactions|stock_transaction_lines|stock_balances)/i);
  assert.doesNotMatch(actions, /createInventoryMovement|stock_transactions|stock_balances/);
});

test("invoice and payment input schemas use bounded ISO-safe values", () => {
  assert.match(validation, /supplier_invoice_no.*max\(160/);
  assert.match(validation, /payment_terms_days.*max\(36_500/);
  assert.match(validation, /tax_amount.*max\(maxOperationalCost/);
  assert.match(validation, /invoice_qty.*max\(maxOperationalQuantity/);
  assert.match(validation, /invoice_unit_price.*max\(maxOperationalCost/);
  assert.match(validation, /payment_date: requiredIsoDate/);
  assert.match(validation, /amount: z\.coerce\.number\(\)\.positive.*max\(maxOperationalCost/);
  assert.match(actions, /parseSupplierInvoiceId/);
  assert.match(actions, /z\.string\(\)\.trim\(\)\.min\(1, "A void reason is required\."\)\.max\(1_000/);
});
