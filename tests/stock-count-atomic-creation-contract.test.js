const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("stock count creation uses one idempotent database aggregate", () => {
  const action = read("src/server/actions/stock-counts.ts");
  const form = read("src/components/stock-count-form.tsx");
  const migration = read("supabase/migrations/109_stock_count_creation_atomicity.sql");

  assert.match(action, /rpc\("create_stock_count_atomic"/);
  assert.doesNotMatch(action, /from\("stock_counts"\)\.insert/);
  assert.match(form, /name="idempotency_key"/);
  assert.match(form, /crypto\.randomUUID\(\)/);
  assert.match(migration, /create or replace function public\.create_stock_count_atomic\(p_payload jsonb\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /stock_counts_idempotency_key_idx/);
  assert.match(migration, /public\.next_document_number\(actor\.company_id, 'stock_count'\)/);
  assert.match(migration, /balance\.current_qty/);
  assert.match(migration, /grant execute on function public\.create_stock_count_atomic\(jsonb\) to authenticated/);
});

test("stock count validation bounds untrusted form payloads", () => {
  const schema = read("src/lib/validations/stock-count.ts");

  assert.match(schema, /max\(500, "A stock count cannot contain more than 500 lines"\)/);
  assert.match(schema, /Count date must use YYYY-MM-DD/);
  assert.match(schema, /Each item can appear only once in a stock count/);
  assert.match(schema, /tolerance_percent: z\.literal\(0\)\.default\(0\)/);
});
