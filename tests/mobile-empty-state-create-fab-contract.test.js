const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const routes = ["products", "purchase-returns", "recipes", "stock-transfers", "supplier-items", "suppliers"];

test("mobile empty states leave creation to the FAB unless filters are active", () => {
  for (const route of routes) {
    const source = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", route, "page.tsx"), "utf8");
    assert.match(source, /(?:data-mobile-primary-action|<ConsoleActionLink[^>]*primary)/, `${route} must keep its create action`);
    assert.match(source, /action=\{filtered \? emptyAction : undefined\}/, `${route} must not duplicate that action in an unfiltered mobile empty state`);
  }
});

test("procurement mobile empty states show one creation entry point", () => {
  for (const route of ["purchase-orders", "goods-receivings"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", route, "page.tsx"), "utf8");
    assert.match(source, /data-mobile-primary-action/, `${route} must keep its create FAB`);
    assert.match(source, /action=\{(?:ordersResult\.unavailable \? .* : filtered \? emptyStateAction|!receivings \|\| filtered \? emptyStateAction) : undefined\}/, `${route} must not duplicate creation in an unfiltered mobile empty state`);
  }
});

test("the shared right console recognises both native and component primary-action metadata", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "components", "layout", "right-console.tsx"), "utf8");
  const action = fs.readFileSync(path.join(__dirname, "..", "src", "components", "layout", "console-action-link.tsx"), "utf8");
  assert.match(source, /function isMobilePrimaryAction/);
  assert.match(source, /child\.props\.primary === true && typeof child\.props\.href === "string"/);
  assert.match(source, /child\.props\["data-mobile-primary-action"\] === true/);
  assert.match(action, /data-mobile-primary-action=\{primary \|\| undefined\}/);
});
