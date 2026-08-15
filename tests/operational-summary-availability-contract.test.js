const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const routes = [
  ["goods-receivings", "getGoodsReceivingSummary", "page.goodsReceivings.summary", "receiving queue remains current"],
  ["purchase-requests", "getPurchaseRequestSummary", "page.purchaseRequests.summary", "request queue remains current"],
  ["purchase-orders", "getPurchaseOrderSummary", "page.purchaseOrders.summary", "order queue remains current"],
  ["recipes", "getRecipeSummary", "page.recipes.summary", "recipe list remains current"],
];

test("operational queues isolate optional summary reads without rendering false zeroes", () => {
  for (const [route, query, source, message] of routes) {
    const page = read("src", "app", "(app)", route, "page.tsx");
    assert.match(page, new RegExp(`Promise\\.allSettled\\(\\[${query}\\(\\)\\]\\)`), route);
    assert.match(page, new RegExp(source.replaceAll(".", "\\.")), route);
    assert.match(page, /summaryResult\.status === "fulfilled" \? summaryResult\.value : null/, route);
    assert.match(page, new RegExp(message), route);
    assert.match(page, /role="status"[\s\S]*Unavailable/, route);
  }
});
