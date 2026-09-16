const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const migration = fs.readFileSync("supabase/migrations/298_purchase_return_read_model.sql", "utf8");
const query = fs.readFileSync("src/server/queries/purchase-returns.ts", "utf8");

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
