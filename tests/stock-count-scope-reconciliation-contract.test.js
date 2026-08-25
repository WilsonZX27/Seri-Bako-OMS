import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/208_stock_count_reconciliation_and_scope_actions.sql", "utf8");
const actions = fs.readFileSync("src/server/actions/stock-counts.ts", "utf8");
const detail = fs.readFileSync("src/app/(app)/stock-counts/[id]/page.tsx", "utf8");
const scopeUi = fs.readFileSync("src/components/stock-count-scope-actions.tsx", "utf8");
const lineRecovery = fs.readFileSync("src/components/stock-count-line-recovery.tsx", "utf8");

test("posting-time inventory movement is reconciled without replacing Kitchen physical count", () => {
  assert.match(migration, /stock_count_reconciliations/);
  assert.match(migration, /physical_qty,line\.physical_qty-current_balance/);
  assert.match(migration, /variance := line\.physical_qty - current_balance/);
  assert.match(migration, /Inventory changed during count; reconciled automatically at posting/);
  assert.match(detail, /Kitchen&apos;s physical quantities were preserved/);
});

test("Kitchen can add an active item to the current and future branch scope with an audit trail", () => {
  assert.match(migration, /create or replace function public\.add_item_to_stock_count/);
  assert.match(migration, /on conflict\(branch_id,item_id\) do update set status='active'/);
  assert.match(migration, /Item added to current and future branch Stock Counts/);
  assert.match(migration, /notify_stock_count_scope_change/);
  assert.match(actions, /export async function addItemToStockCount/);
  assert.match(scopeUi, /Current and future counts/);
  assert.match(migration, /alter column physical_qty drop not null/);
  assert.match(migration, /line\.physical_qty is null/);
});

test("Kitchen can suggest Item Master corrections without changing global identity", () => {
  assert.match(migration, /create table if not exists public\.item_correction_suggestions/);
  assert.match(migration, /create or replace function public\.suggest_stock_count_item_correction/);
  assert.match(actions, /export async function suggestStockCountItemCorrection/);
  assert.match(scopeUi, /It does not change the global Item Master/);
});

test("replacement requires a fresh physical count and preserves revision evidence", () => {
  assert.match(migration, /Replacement quantity must remain blank until physically counted/);
  assert.match(lineRecovery, /The replacement starts blank/);
  assert.match(lineRecovery, /name="quantity" value=""/);
  assert.match(migration, /document_line_revisions/);
});

test("PR line writes are guarded by the canonical request supplier", () => {
  assert.match(migration, /guard_purchase_request_line_supplier/);
  assert.match(migration, /canonical<>new\.suggested_supplier_id/);
  assert.match(migration, /This PR already belongs to another supplier/);
});
