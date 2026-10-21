const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/298_purchase_return_read_model.sql", "utf8");
const query = fs.readFileSync("src/server/queries/purchase-returns.ts", "utf8");
const listPage = fs.readFileSync("src/app/(app)/purchase-returns/page.tsx", "utf8");

test("purchase return queue filters and paginates in the database", () => {
  assert.match(migration, /purchase_returns_list_view[\s\S]*security_invoker = true/);
  assert.match(migration, /count\(line\.id\)::integer as line_count/);
  assert.match(migration, /sum\(line\.line_total\)/);
  assert.match(query, /from\("purchase_returns_list_view"\)\.select\("\*", \{ count: "exact" \}\)/);
  assert.match(query, /query\.range\(/);
  assert.doesNotMatch(query, /const returnIds = returns\.map/);
});

test("purchase return summary is one RLS-preserving aggregate", () => {
  assert.match(migration, /function public\.get_purchase_return_summary\(\)/);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(migration, /count\(\*\) filter \(where status = 'draft'\)/);
  assert.match(query, /rpc\("get_purchase_return_summary"\)/);
});

test("purchase return queue explains the posted-GRN path and labels compact controls", () => {
  assert.match(listPage, /Stock is deducted when a return is posted/);
  assert.match(listPage, /canCreate[\s\S]*Create a return from a posted goods receipt/);
  assert.match(listPage, /Returns created from posted goods receipts will appear here/);
  assert.match(listPage, /aria-label="Search return, GRN, PO, or supplier"/);
  assert.match(listPage, /className="sb-purchase-return-query"/);
});
