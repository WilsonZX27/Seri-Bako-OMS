import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const migration = read("supabase/migrations/170_recoverable_document_line_workflow.sql");

test("line revisions are tenant scoped, idempotent, audited, and concurrency checked", () => {
    assert.match(migration, /create table if not exists public\.document_line_revisions/);
    assert.match(migration, /company_id = public\.current_staff_company_id\(\)/);
    assert.match(migration, /unique \(company_id, idempotency_key\)/);
    assert.match(migration, /expected_line_updated_at/);
    assert.match(migration, /activity_logs/);
  });

  test("stock count proposals block only posting and preserve original evidence", () => {
    assert.match(migration, /status in \('pending','applied','rejected'\)/);
    assert.match(migration, /prevent_stock_count_post_with_pending_changes/);
    assert.match(migration, /Review every pending stock count line change before posting/);
    assert.match(migration, /That replacement Item already exists in this count/);
  });

  test("committed purchase order lines are immutable", () => {
    assert.match(migration, /prevent_committed_purchase_order_line_mutation/);
    assert.match(migration, /order_status <> 'draft'/);
  });

  test("PR and stock count surfaces expose recovery rather than dead-end errors", () => {
    const pr = read("src/app/(app)/purchase-requests/[id]/page.tsx");
    const stockCount = read("src/app/(app)/stock-counts/[id]/page.tsx");
    assert.match(pr, /Review \{blockingLineIssues\.length\} item issue/);
    assert.match(pr, /Stock unavailable/);
    assert.match(pr, /PurchaseRequestLineRecovery/);
    assert.match(stockCount, /Progress is saved/);
    assert.match(stockCount, /StockCountLineRecovery/);
  });
