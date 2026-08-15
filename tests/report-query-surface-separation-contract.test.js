const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const routes = [
  "src/app/(app)/administration/master-data-cleanup/page.tsx",
  "src/app/(app)/production/variance/page.tsx",
  "src/app/(app)/reports/product-margin/page.tsx",
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
  const margin = fs.readFileSync(path.join(process.cwd(), routes[2]), "utf8");

  assert.match(cleanup, /<OperationalList ariaLabel="Master data cleanup issues">/);
  assert.match(variance, /data-production-variance-list/);
  assert.match(margin, /data-product-margin-mobile-list/);
});
