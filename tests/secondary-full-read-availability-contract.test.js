const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("secondary full reads cannot replace paginated queues with false zero summaries", () => {
  const purchaseReturnsPage = read("src", "app", "(app)", "purchase-returns", "page.tsx");
  const purchaseReturnsQuery = read("src", "server", "queries", "purchase-returns.ts");
  assert.match(purchaseReturnsPage, /Promise\.allSettled\(\[getPurchaseReturnSummary\(\)\]\)/);
  assert.doesNotMatch(purchaseReturnsPage, /getPurchaseReturns\(\{ page: "all" \}\)/);
  assert.match(purchaseReturnsQuery, /from\("purchase_returns_list_view"\)\.select\("\*", \{ count: "exact" \}\)/);
  assert.match(purchaseReturnsQuery, /query\.range\(/);
  assert.match(purchaseReturnsQuery, /rpc\("get_purchase_return_summary"\)/);
  assert.match(purchaseReturnsPage, /page\.purchaseReturns\.summary/);
  assert.match(purchaseReturnsPage, /return queue remains current/);

  for (const [route, listQuery, summaryQuery, rpc, source, continuity] of [
    ["stock-transfers", "getStockTransfers", "getStockTransferSummary", "get_stock_transfer_summary", "page.stockTransfers.summary", "transfer queue remains current"],
    ["stock-wastage", "getStockWastage", "getStockWastageSummary", "get_stock_wastage_summary", "page.stockWastage.summary", "current queue remains available"],
  ]) {
    const page = read("src", "app", "(app)", route, "page.tsx");
    const query = read("src", "server", "queries", "stock-operations.ts");
    assert.match(page, new RegExp(`Promise\\.allSettled\\(\\[${summaryQuery}\\(\\)\\]\\)`), route);
    assert.doesNotMatch(page, new RegExp(`${listQuery}\\(\\{ page: "all" \\}\\)`), route);
    assert.match(query, new RegExp(`rpc\\("${rpc}"\\)`), route);
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
  assert.match(page, /summaryResult\.unavailable[\s\S]*Unavailable/);
  assert.doesNotMatch(page, /loadProductionJobs\(\{ page: "all" \}\)/);
});
