const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (path) => fs.readFileSync(path, "utf8");

test("GRN posting owns the current draft quantities without a separate save action", () => {
  const editor = read("src/components/goods-receiving-draft-editor.tsx");
  const action = read("src/server/actions/goods-receivings.ts");
  assert.doesNotMatch(editor, /Save received quantities/);
  assert.match(editor, /id="goods-receiving-post-form"/);
  assert.match(action, /update_goods_receiving_draft_atomic[\s\S]*post_goods_receiving_atomic/);
});

test("branch shortcuts preserve the default branch", () => {
  const source = read("src/components/staff-access-fields.tsx");
  assert.match(source, /Select all/);
  assert.match(source, /Default only/);
  assert.match(source, /setBranchIds\(defaultBranchId \? \[defaultBranchId\] : \[\]\)/);
  assert.match(source, /disabled=\{isDefault\}/);
});

test("permission switches derive inherit allow and deny from role defaults", () => {
  const source = read("src/components/staff-permission-overrides.tsx");
  assert.match(source, /role="switch"/);
  assert.match(source, /enabled === permission\.roleDefault \? "inherit" : enabled \? "allow" : "deny"/);
  for (const category of ["Operations", "Procurement", "Inventory", "People & Attendance", "Compliance", "Analytics", "Administration", "Other"]) assert.match(source, new RegExp(category.replace("&", "\\&")));
});

test("dashboard and low-stock page consume one branch-item result authority", () => {
  const dashboard = read("src/server/queries/dashboard.ts");
  const page = read("src/app/(app)/low-stock/page.tsx");
  assert.match(dashboard, /getLowStockResult\(\)/);
  assert.match(page, /getLowStockResult\(filters\)/);
  assert.doesNotMatch(dashboard, /new Set\([\s\S]*lowStockViewRows/);
});

test("unavailable low-stock data never renders a healthy zero", () => {
  const query = read("src/server/queries/inventory.ts");
  const page = read("src/app/(app)/low-stock/page.tsx");
  assert.match(query, /count: null, unavailable: true/);
  assert.match(page, /Low stock is unavailable/);
  assert.match(page, /unavailable \? "Unavailable" : count/);
});

test("movement ledger and grouped supplier basket use compact presentation", () => {
  const css = read("src/app/design-system-v2.css");
  const basket = read("src/components/stock-balance-workspace.tsx");
  assert.match(css, /\.sb-stock-movement-ledger \{\s*min-width: 72rem/);
  assert.match(basket, /line\.item_code\}\{isCreateBranch \? "" :/);
});
