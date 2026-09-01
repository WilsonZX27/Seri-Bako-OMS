const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("branch Stock Count lifecycle keeps history and applies retirement only after posting", () => {
  const migration = read("supabase", "migrations", "203_stock_count_item_lifecycle.sql");
  assert.match(migration, /create table public\.branch_stock_count_items/);
  assert.match(migration, /'active','pending_retirement','retired'/);
  assert.match(migration, /after update of status on public\.stock_counts/);
  assert.match(migration, /new\.status<>'posted'/);
  assert.match(migration, /last_physical_qty/);
  assert.match(migration, /recipient_role_id/);
  assert.match(migration, /role_code in \('purchasing','finance'\)/);
  assert.doesNotMatch(migration, /delete from public\.stock_transactions/);
});

test("zero-movement mapped items enter the eligible Stock Count source while retired items stay out", () => {
  const migration = read("supabase", "migrations", "203_stock_count_item_lifecycle.sql");
  const query = read("src", "server", "queries", "stock-counts.ts");
  assert.match(migration, /create or replace view public\.stock_count_eligible_items/);
  assert.match(migration, /scope\.status in \('active','pending_retirement'\)/);
  assert.match(migration, /scope\.status is distinct from 'retired'/);
  assert.match(migration, /replace\(definition,'public\.stock_balances_view','public\.stock_count_eligible_items'\)/);
  assert.match(query, /from\("stock_count_eligible_items"\)/);
  assert.match(migration, /'OIYIN00012','OIYIN00006'/);
  assert.doesNotMatch(migration, /ilike|similarity/i);
});

test("Kitchen retirement dialog requires category and explanation and retains the final count line", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const actions = read("src", "server", "actions", "stock-counts.ts");
  assert.match(form, /Retire item after this count/);
  assert.doesNotMatch(form, /Retires after posting|Retirement scheduled/);
  assert.match(form, /Wrong or duplicate item code/);
  assert.match(form, /line_retirement_reason/);
  assert.match(form, /line_retirement_note/);
  assert.match(actions, /sync_stock_count_item_retirements/);
});

test("AutoCount API failures remain JSON and the client rejects HTML safely", () => {
  const middleware = read("src", "lib", "supabase", "middleware.ts");
  const workflow = read("src", "components", "imports", "autocount-import-workflow.tsx");
  const parser = read("src", "lib", "http", "read-json-response.ts");
  assert.match(middleware, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(middleware, /NextResponse\.json[\s\S]*status: 401/);
  assert.match(workflow, /readJsonResponse/);
  assert.match(parser, /headers\.get\("content-type"\)/);
  assert.match(parser, /!contentType\.includes\("application\/json"\)/);
  assert.match(workflow, /Your session expired/);
  assert.match(parser, /response\.status === 401 \|\| response\.redirected/);
});
