const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("secondary full reads cannot replace paginated queues with false zero summaries", () => {
  for (const [route, query, source, continuity] of [
    ["purchase-returns", "getPurchaseReturns", "page.purchaseReturns.summary", "return queue remains current"],
    ["stock-transfers", "getStockTransfers", "page.stockTransfers.summary", "transfer queue remains current"],
    ["stock-wastage", "getStockWastage", "page.stockWastage.summary", "current queue remains available"],
  ]) {
    const page = read("src", "app", "(app)", route, "page.tsx");
    assert.match(page, new RegExp(`Promise\\.allSettled\\(\\[${query}\\(\\{ page: "all" \\}\\)\\]\\)`), route);
    assert.match(page, new RegExp(source.replaceAll(".", "\\.")), route);
    assert.match(page, new RegExp(continuity), route);
  }
});

test("production jobs preserve explicit unavailable states for list, summary, and branch filter", () => {
  const page = read("src", "app", "(app)", "production", "jobs", "page.tsx");
  assert.doesNotMatch(page, /paginateRows\(\[\]/);
  assert.match(page, /data: null, unavailable: true/);
  assert.match(page, /Production jobs are unavailable/);
  assert.match(page, /Branch filter unavailable/);
  assert.match(page, /!branches && filters\.branch_id[\s\S]*type="hidden" name="branch_id"/);
  assert.match(page, /allJobsResult\.unavailable[\s\S]*Unavailable/);
});
