const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("stock counts preserve independent list, summary, and branch unavailable states", () => {
  const page = read("src", "app", "(app)", "stock-counts", "page.tsx");

  assert.doesNotMatch(page, /paginateRows\(\[\]/);
  assert.match(page, /page\.stockCounts\.list[\s\S]*data: null, unavailable: true/);
  assert.match(page, /page\.stockCounts\.branchFilter[\s\S]*data: null, unavailable: true/);
  assert.match(page, /page\.stockCounts\.summary[\s\S]*data: null, unavailable: true/);
  assert.match(page, /Stock counts are unavailable/);
  assert.match(page, /Branch filter unavailable/);
  assert.match(page, /!branches && filters\.branch_id[\s\S]*type="hidden" name="branch_id"/);
  assert.match(page, /summaryResult\.unavailable[\s\S]*current count queue remains independent/);
  assert.match(page, /branches \? <StockCountExportDialog[\s\S]*Export unavailable/);
  assert.match(page, /counts \? <PaginationControls/);
});

test("stock count fallback rejects incomplete branch or line hydration", () => {
  const query = read("src", "server", "queries", "stock-counts.ts");

  assert.match(query, /branches, error: branchesError/);
  assert.match(query, /lines, error: linesError/);
  assert.match(query, /rawCountsError \|\| branchesError \|\| linesError/);
  assert.match(query, /stockCounts\.varianceInsight\.branch/);
  assert.match(query, /logServerWarning\(error, \{ source: "stockCounts\.varianceInsight\.rpc" \}\)/);
});

test("stock count reads never coerce incomplete payloads into zero or empty verified data", () => {
  const query = read("src", "server", "queries", "stock-counts.ts");

  assert.match(query, /!data \|\| count === null/);
  assert.match(query, /Stock count summary returned incomplete data/);
  assert.match(query, /Stock Count detail returned incomplete line data/);
  assert.match(query, /Stock Count variance counts returned no data/);
  assert.match(query, /Stock Count variance lines returned no data/);
  assert.match(query, /Stock Count variance items returned no data/);
  assert.doesNotMatch(query, /return databasePagination\(\(data \?\? \[\]\)/);
});
