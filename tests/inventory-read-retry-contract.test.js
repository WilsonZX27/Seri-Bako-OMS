const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const source = fs.readFileSync("src/server/queries/inventory.ts", "utf8");

test("inventory read retries are bounded to transient failures", () => {
  assert.match(source, /INVENTORY_READ_RETRY_DELAYS_MS = \[350, 900\]/);
  assert.match(source, /\["500", "57014", "PGRST002"/);
  assert.match(source, /57014/);
  assert.match(source, /PGRST002/);
  assert.match(source, /PGRST003/);
  assert.match(source, /setTimeout\(resolve, delayMs\)/);
  assert.match(source, /boundedInventoryInsight\(\(\) => supabase\.rpc\("get_stock_card_bounded"/);
  assert.match(source, /boundedInventoryInsight\(\(\) => supabase\.rpc\("get_stock_ledger_bounded_page"/);
});

test("inventory read retry still preserves fail-closed unavailable handling", () => {
  const stockCard = source.slice(source.indexOf("export async function getStockCardResult"));
  assert.match(stockCard, /return \{ rows: \[\], unavailable: true \}/);
  assert.match(source, /error: "Movement Ledger data is temporarily unavailable\."/);
  assert.doesNotMatch(stockCard, /return \{ rows: \[\], unavailable: false \}/);
});
