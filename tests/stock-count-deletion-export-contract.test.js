const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("Stock Count draft removal is an audited, status-gated atomic RPC", () => {
  const action = read("src", "server", "actions", "stock-counts.ts");
  const detail = read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx");
  const migration = read("supabase", "migrations", "116_stock_count_draft_deletion.sql");
  const types = read("src", "types", "database.ts");

  assert.match(action, /delete_stock_count_draft_atomic/);
  assert.match(detail, /DangerConfirmForm action=\{deleteStockCount\.bind/);
  assert.match(detail, /collapseMoreOptions/);
  assert.match(detail, /count\.status === "draft" \|\| count\.status === "cancelled"/);
  assert.match(migration, /for update/);
  assert.match(migration, /status not in \('draft', 'cancelled'\)/);
  assert.match(migration, /set deleted_at = now\(\)/);
  assert.match(migration, /insert into public\.activity_logs/);
  assert.match(types, /delete_stock_count_draft_atomic/);
});

test("Stock Count export accepts the selected date range", () => {
  const list = read("src", "app", "(app)", "stock-counts", "page.tsx");
  const route = read("src", "app", "api", "export", "[table]", "route.ts");

  assert.match(list, /const exportHref = `\/api\/export\/stock-counts/);
  assert.match(list, /filters\.from/);
  assert.match(list, /filters\.to/);
  assert.match(route, /stock-counts/);
  assert.match(route, /dateColumn: "count_date"/);
  assert.match(route, /query\.gte\(config\.dateColumn/);
  assert.match(route, /query\.lte\(config\.dateColumn/);
});

test("Stock Count autosave waits for a deliberate idle interval", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  assert.match(form, /setTimeout\(\(\) => void saveDraft\(dirtyRevision\), 2000\)/);
  assert.doesNotMatch(form, /saveDraft\(dirtyRevision\), 800\)/);
  assert.match(form, /data-mobile-document-action[\s\S]*autosaveLabel/);
});
