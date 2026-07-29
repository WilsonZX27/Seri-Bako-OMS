import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration111 = readFileSync(
  "supabase/migrations/111_central_kitchen_purchase_request_atomic.sql",
  "utf8",
);
const migration113 = readFileSync(
  "supabase/migrations/113_retire_central_kitchen_pr_reservation_workflow.sql",
  "utf8",
);
const databaseTypes = readFileSync("src/types/database.ts", "utf8");

test("applied Central Kitchen migrations remain in canonical history", () => {
  assert.match(migration111, /create_central_kitchen_purchase_request_atomic/);
  assert.match(migration111, /purchase_request_stock_holds/);
});

test("migration 113 disables the unapproved workflow without deleting audit data", () => {
  assert.match(migration113, /drop function\s+public\.create_central_kitchen_purchase_request_atomic/s);
  assert.match(migration113, /revoke all on table public\.purchase_request_stock_holds/s);
  assert.doesNotMatch(migration113, /drop table/i);
  assert.match(migration113, /ordinary PR Draft/);
  assert.match(migration113, /never reserves inventory/);
});

test("application database types do not expose the retired RPC", () => {
  assert.doesNotMatch(
    databaseTypes,
    /create_central_kitchen_purchase_request_atomic/,
  );
});
