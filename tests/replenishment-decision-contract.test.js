const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const model = fs.readFileSync(path.join(root, "src", "lib", "replenishment-decision.ts"), "utf8");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "low-stock", "page.tsx"), "utf8");

test("low-stock recommendations expose accountable next actions", () => {
  assert.match(model, /export type ReplenishmentDecision = "buy_now" \| "fix_supplier" \| "monitor"/);
  assert.match(model, /No supplier is mapped/);
  assert.match(model, /Below safety by/);
  assert.match(model, /Supplier mapped; keep watching/);
  assert.match(page, /getReplenishmentDecision/);
  assert.match(page, /data-low-stock-decision/);
  assert.match(page, /Buy now/);
  assert.match(page, /Supplier fixes/);
});
