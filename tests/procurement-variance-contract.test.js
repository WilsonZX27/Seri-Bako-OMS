const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const query = fs.readFileSync("src/server/queries/procurement-variance.ts", "utf8");
const page = fs.readFileSync("src/app/(app)/reports/procurement-variance/page.tsx", "utf8");
const version = fs.readFileSync("src/lib/app-version.ts", "utf8");

test("procurement variance only compares existing document-line links", () => {
  assert.match(query, /goods_receiving_line_id === grnLine\.id/);
  assert.match(query, /purchase_order_line_id === line\.id/);
  assert.match(query, /Missing GRN|Missing invoice|Review manually/);
  assert.match(query, /comparison_date >= filters\.date_from/);
  assert.doesNotMatch(query, /suppliers\.company_id/);
});

test("procurement variance keeps warning calculations read-only", () => {
  assert.match(query, /actual - expected/);
  assert.match(query, /Math\.abs\(amount\) > 0\.01/);
  assert.match(query, /Math\.abs\(amount \/ expected\) > 0\.02/);
  assert.doesNotMatch(query, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
});

test("procurement variance route explains thresholds and release", () => {
  assert.match(page, /Thresholds are warnings, not automatic claims/);
  assert.match(page, /No PO, GRN, invoice, supplier price, or stock record is changed/);
  assert.match(version, /0\.2\.37/);
  assert.match(version, /Sprint 7\.23\.5/);
});
