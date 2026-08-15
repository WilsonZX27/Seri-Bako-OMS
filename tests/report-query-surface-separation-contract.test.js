const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const routes = [
  "src/app/(app)/administration/master-data-cleanup/page.tsx",
  "src/app/(app)/production/variance/page.tsx",
  "src/app/(app)/reports/costing-readiness/page.tsx",
  "src/app/(app)/reports/procurement-variance/page.tsx",
  "src/app/(app)/reports/product-margin/page.tsx",
  "src/app/(app)/reports/recipe-costing/page.tsx",
];

test("high-density report filters and result cards remain sibling surfaces", () => {
  for (const route of routes) {
    const source = fs.readFileSync(path.join(process.cwd(), route), "utf8");
    assert.match(source, /<FilterBar[\s\S]*?<section className="sb-list-content-card overflow-hidden">/);
    assert.doesNotMatch(source, /<section className="overflow-hidden border bg-card"[^>]*>[\s\S]{0,300}<FilterBar/);
  }
});

test("each separated result surface retains a narrow-workspace equivalent", () => {
  const cleanup = fs.readFileSync(path.join(process.cwd(), routes[0]), "utf8");
  const variance = fs.readFileSync(path.join(process.cwd(), routes[1]), "utf8");
  const readiness = fs.readFileSync(path.join(process.cwd(), routes[2]), "utf8");
  const procurement = fs.readFileSync(path.join(process.cwd(), routes[3]), "utf8");
  const margin = fs.readFileSync(path.join(process.cwd(), routes[4]), "utf8");
  const recipe = fs.readFileSync(path.join(process.cwd(), routes[5]), "utf8");

  assert.match(cleanup, /<OperationalList ariaLabel="Master data cleanup issues">/);
  assert.match(variance, /data-production-variance-list/);
  assert.match(readiness, /data-costing-readiness-list/);
  assert.match(procurement, /<OperationalList ariaLabel="Procurement cost variance">/);
  assert.match(margin, /data-product-margin-mobile-list/);
  assert.match(recipe, /<OperationalList ariaLabel="Recipe costing estimates">/);
});
