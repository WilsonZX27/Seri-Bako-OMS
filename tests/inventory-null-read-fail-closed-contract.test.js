const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/server/queries/inventory.ts", "utf8");

function functionBody(name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `missing ${name}`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("inventory summary reads fail closed when RPC returns null data without an error", () => {
  assert.match(functionBody("getInventoryDailyMovement"), /if \(error \|\| !data\)/);
  assert.match(functionBody("getStockLedger"), /if \(error \|\| !data\)/);
  assert.match(functionBody("getStockCardResult"), /if \(error \|\| !data\)/);
});

test("stock ledger does not coerce a null RPC payload into an empty verified result", () => {
  const ledger = functionBody("getStockLedger");
  assert.doesNotMatch(ledger, /const result = data \?\? \[\]/);
  assert.match(ledger, /const result = data;/);
});

test("inventory fallbacks mark low-stock unavailable when the canonical fallback cannot confirm it", () => {
  assert.match(source, /if \(!transactions\) throw new Error\("Inventory daily movement fallback returned no data\."\)/);
  assert.match(source, /if \(!transactionData\) throw new Error\("Stock Card transaction fallback returned no data\."\)/);
  assert.match(source, /const balancesUnavailable = Boolean\(balancesResult\.error \|\| !balancesResult\.data/);
  assert.match(source, /const summaryError = error \?\? \(data == null \? new Error\("Low stock summary returned no data\."\) : null\)/);
  assert.match(source, /from\("low_stock_items"\)/);
  assert.match(source, /error = legacyResult\.error/);
  assert.match(source, /if \(!branchId && !customThreshold\)/);
  assert.match(source, /return \{ rows: \[\], count: null, unavailable: true \}/);
});

test("stock balance base reads do not return a null payload as a verified list", () => {
  const balances = functionBody("getStockBalances");
  assert.match(balances, /if \(!data\) \{/);
  assert.match(balances, /Stock Balance data is temporarily unavailable/);
});
