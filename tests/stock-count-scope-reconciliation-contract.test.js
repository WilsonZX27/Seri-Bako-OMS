import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/migrations/208_stock_count_reconciliation_and_scope_actions.sql", "utf8");
const actions = fs.readFileSync("src/server/actions/stock-counts.ts", "utf8");
const detail = fs.readFileSync("src/app/(app)/stock-counts/[id]/page.tsx", "utf8");
const scopeUi = fs.readFileSync("src/components/stock-count-scope-actions.tsx", "utf8");
const lineRecovery = fs.readFileSync("src/components/stock-count-line-recovery.tsx", "utf8");
const snapshotAuthority = fs.readFileSync("supabase/migrations/237_stock_count_snapshot_posting_authority.sql", "utf8");
const enforcedSnapshotAuthority = fs.readFileSync("supabase/migrations/238_enforce_stock_count_snapshot_posting_patch.sql", "utf8");

test("posting-time inventory movement is reconciled without replacing Kitchen physical count", () => {
  assert.match(migration, /stock_count_reconciliations/);
  assert.match(migration, /physical_qty,line\.physical_qty-current_balance/);
  assert.match(migration, /variance := line\.physical_qty - current_balance/);
  assert.match(migration, /Inventory changed during count; reconciled automatically at posting/);
  assert.match(detail, /Physical quantities were kept; final variance uses the latest ledger balance/);
  assert.match(detail, /Retired by this Stock Count/);
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

test("snapshot posting patch fails closed when Production function formatting differs", () => {
  assert.match(enforcedSnapshotAuthority, /regexp_replace/);
  assert.match(enforcedSnapshotAuthority, /Could not verify draft UOM snapshot guard/);
  assert.match(enforcedSnapshotAuthority, /Could not verify posting UOM snapshot guard/);
});

test("saved Stock Count snapshots remain postable after Item Master lifecycle changes", () => {
  assert.match(snapshotAuthority, /update_stock_count_draft_atomic\(uuid,jsonb\)/);
  assert.match(snapshotAuthority, /and line\.uom = nullif\(trim\(submitted->>'uom'\), ''\)/);
  assert.match(snapshotAuthority, /post_stock_count_atomic\(uuid\)/);
  assert.match(snapshotAuthority, /and item\.deleted_at is null/);
  assert.match(snapshotAuthority, /coalesce\(item_row\.item_code, line\.item_id::text\)/);
  assert.match(snapshotAuthority, /\$new\$      and item\.deleted_at is null;\$new\$/);
});
