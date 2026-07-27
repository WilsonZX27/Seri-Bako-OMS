const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const routes = ["products", "purchase-returns", "recipes", "stock-transfers", "supplier-items", "suppliers"];

test("mobile empty states leave creation to the FAB unless filters are active", () => {
  for (const route of routes) {
    const source = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", route, "page.tsx"), "utf8");
    assert.match(source, /data-mobile-primary-action/, `${route} must keep its create action`);
    assert.match(source, /action=\{filtered \? emptyAction : undefined\}/, `${route} must not duplicate that action in an unfiltered mobile empty state`);
  }
});
