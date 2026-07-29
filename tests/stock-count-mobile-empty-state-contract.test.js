const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", "stock-counts", "page.tsx"), "utf8");

test("stock count phone empty state does not duplicate the create FAB", () => {
  assert.match(source, /action=\{filtered \? emptyAction : undefined\}/);
  assert.match(source, /data-mobile-primary-action/);
  assert.match(source, /href="\/stock-counts\/new"/);
  assert.match(source, /<EmptyState[\s\S]*action=\{emptyAction\}/);
  assert.doesNotMatch(source, /<OperationalList[\s\S]*action=\{emptyAction\}/);
});
