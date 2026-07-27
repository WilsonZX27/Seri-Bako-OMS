const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const route = fs.readFileSync("src/app/api/imports/confirm/route.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/108_opening_stock_atomic_numbering.sql", "utf8");

test("opening-stock import delegates number allocation to its atomic posting RPC", () => {
  const openingImport = route.slice(route.indexOf("async function handleOpeningStockImport"), route.indexOf("function revalidateImportTargets"));
  assert.doesNotMatch(openingImport, /getNextDocumentNumber/);
  assert.doesNotMatch(openingImport, /transaction_no:/);
  assert.match(openingImport, /rpc\("post_opening_stock_batch", \{ p_rows: candidates \}\)/);
});

test("opening-stock batch allocates collision-safe numbers and rolls them back with failed writes", () => {
  assert.match(migration, /create or replace function public\.allocate_opening_stock_number/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /from public\.stock_transactions where transaction_no = v_candidate/);
  assert.match(migration, /create or replace function public\.post_opening_stock_batch/);
  assert.match(migration, /transaction_number := public\.allocate_opening_stock_number\(branch_company_id\)/);
  assert.match(migration, /update public\.document_sequence_periods[\s\S]*next_number = 1/);
});
