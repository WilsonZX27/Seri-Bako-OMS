const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("operational query defaults share the Kuala Lumpur business date", () => {
  const helper = read("src/lib/business-date.ts");
  assert.match(helper, /timeZone: "Asia\/Kuala_Lumpur"/);
  assert.match(helper, /export function shiftBusinessDate/);
  assert.match(helper, /export function businessDateDaysAgo/);
  assert.match(helper, /export function businessDateDaysAhead/);

  const queryFiles = [
    "src/server/queries/common.ts",
    "src/server/queries/dashboard.ts",
    "src/server/queries/goods-receivings.ts",
    "src/server/queries/inventory.ts",
    "src/server/queries/notifications.ts",
    "src/server/queries/outlet-daily-records.ts",
    "src/server/queries/production-jobs.ts",
    "src/server/queries/procurement.ts",
    "src/server/queries/stock-operations.ts",
    "src/server/queries/supplier-invoices.ts",
  ];
  for (const file of queryFiles) {
    const source = read(file);
    assert.match(source, /business-date/, `${file} must import the shared business-date helper`);
    assert.doesNotMatch(source, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/, `${file} must not derive an operational today value from UTC`);
  }
});

test("stock count seeds do not turn an unverified balance into physical zero", () => {
  const source = read("src/server/queries/stock-counts.ts");
  assert.match(source, /physical_qty: lastPostedPhysicalByItem\.get\(row\.item_id\)/);
  assert.match(source, /Number\(row\.current_qty\) !== 0 \? row\.current_qty : null/);
  assert.match(source, /prefill_source.*unavailable/);
});
