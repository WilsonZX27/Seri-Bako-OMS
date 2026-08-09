import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("workbook exports enforce row and output budgets", () => {
  const source = read("src/app/api/export/stock-counts-workbook/route.ts");
  assert.match(source, /MAX_STOCK_COUNTS = 10_000/);
  assert.match(source, /MAX_STOCK_COUNT_LINES = 50_000/);
  assert.match(source, /limit\(MAX_STOCK_COUNTS \+ 1\)/);
  assert.match(source, /limit\(MAX_STOCK_COUNT_LINES \+ 1\)/);
  assert.match(source, /MAX_WORKBOOK_BYTES/);
});

test("AP aging exports enforce row and output budgets", () => {
  const route = read("src/app/api/export/ap-aging/route.ts");
  const query = read("src/server/queries/ap-aging.ts");
  assert.match(route, /MAX_AP_AGING_EXPORT_ROWS = 50_000/);
  assert.match(route, /MAX_AP_AGING_EXPORT_BYTES/);
  assert.match(route, /getCompleteApAgingReport\(params, \{ maxRows: MAX_AP_AGING_EXPORT_ROWS \}\)/);
  assert.match(query, /options: \{ maxRows\?: number \}/);
  assert.match(query, /report\.total_rows > maxRows/);
});
