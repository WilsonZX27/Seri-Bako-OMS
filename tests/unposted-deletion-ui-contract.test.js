const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("every operational document exposes an explicit delete action before posting", () => {
  const routes = [
    ["goods-receivings", "[id]", "page.tsx"],
    ["purchase-requests", "[id]", "page.tsx"],
    ["purchase-orders", "[id]", "page.tsx"],
    ["purchase-returns", "[id]", "page.tsx"],
    ["production", "jobs", "[id]", "page.tsx"],
    ["stock-transfers", "[id]", "page.tsx"],
    ["stock-wastage", "[id]", "page.tsx"],
  ];

  for (const route of routes) {
    const source = read("src", "app", "(app)", ...route);
    assert.match(source, /(?:Delete|Cancel) (?:draft|unposted|purchase|return|production|transfer|wastage|stock)/, route.join("/"));
    assert.match(source, /deleted_at|cancel[A-Z]|delete[A-Z]/, `${route.join("/")} keeps an audited removal path`);
  }
});

test("posted Stock Counts reverse through an explicit immutable audit boundary", () => {
  const stockCount = read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx");
  const receiving = read("src", "app", "(app)", "goods-receivings", "[id]", "page.tsx");
  assert.match(stockCount, /count\.status === "posted"/);
  assert.match(stockCount, /StockCountVoidDialog/);
  assert.match(receiving, /receiving\.status === "posted"/);
});
