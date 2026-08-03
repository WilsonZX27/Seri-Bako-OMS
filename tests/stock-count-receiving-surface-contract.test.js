const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("Stock Count exposes only the current workflow states in its filter", () => {
  const page = read("src", "app", "(app)", "stock-counts", "page.tsx");
  assert.match(page, /const statuses = \["draft", "posted", "cancelled"\]/);
  assert.match(page, /legacy states[\s\S]*remain readable/i);
  assert.doesNotMatch(page, /const statuses = \["draft", "submitted", "reviewed"/);
  assert.doesNotMatch(page, />In review<\/dt>/);
  assert.match(page, />Draft<\/dt>/);
  assert.match(page, />Cancelled<\/dt>/);
});

test("Goods Receiving uses one form surface and compact phone filters", () => {
  const form = read("src", "components", "goods-receiving-form.tsx");
  const page = read("src", "app", "(app)", "goods-receivings", "page.tsx");
  assert.match(form, /<div className="min-w-0">/);
  assert.doesNotMatch(form, /<Card className=/);
  assert.match(page, /className="sb-list-filters--compact-mobile"/);
});

test("Goods Receiving keeps the no-PO empty state in the same continuous surface", () => {
  const form = read("src", "components", "goods-receiving-form.tsx");
  assert.match(form, /data-goods-receiving-empty className="border-t border-\[var\(--sb-border-soft\)\] bg-\[var\(--sb-surface\)\]/);
  assert.doesNotMatch(form, /data-goods-receiving-empty className="erp-surface/);
});
