const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", "stock-counts", "page.tsx"), "utf8");

test("stock count phone empty state does not duplicate the create FAB", () => {
  assert.match(source, /action=\{filtered \? emptyAction : undefined\}/);
  assert.match(source, /action=\{canCreate \? \{ href: "\/stock-counts\/new", label: "New Stock Count" \} : undefined\}/);
  assert.doesNotMatch(source, /data-mobile-primary-action/);
});
