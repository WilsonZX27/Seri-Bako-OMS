const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const product = fs.readFileSync(path.join(root, "PRODUCT.md"), "utf8");
const design = fs.readFileSync(path.join(root, "DESIGN.md"), "utf8");
const plan = fs.readFileSync(path.join(root, "docs", "qa", "US100K_CLOSURE_PLAN_2026-08-17.md"), "utf8");

test("the US$100k closure ledger keeps the release boundary explicit", () => {
  assert.match(product, /current released application baseline is `v8\.64\.55`/);
  assert.match(product, /v8\.64\.56 \(unreleased\)/);
  assert.match(product, /migration 157/);
  assert.match(design, /v8\.64\.56 \(unreleased\)/);
  assert.match(plan, /Current released baseline:\*\* `v8\.64\.55`/);
  assert.match(plan, /Local forward contract:\*\* `v8\.64\.56`/);
  assert.match(plan, /Migration 157 applied to production/);
  assert.match(plan, /Production deployment evidence is also separate/);
});

test("the closure ledger carries decision-quality requirements", () => {
  for (const phrase of [
    "Question",
    "Population and grain",
    "Formula and UOM",
    "Completeness",
    "Owner and due time",
    "Impact",
    "Drill-through",
    "Buy now",
    "Supplier follow-up",
    "Waste reduction",
    "Cash pressure",
    "Margin readiness",
  ]) {
    assert.match(plan, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
