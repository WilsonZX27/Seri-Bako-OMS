const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("mobile ledger rows expose source context and semantic direction", () => {
  const source = read("src/app/(app)/stock-transactions/page.tsx");

  assert.match(source, /row\.transaction_no.*row\.transaction_date/s);
  assert.match(source, /row\.item_code.*row\.branch_name/s);
  assert.match(source, /direction === "in".*var\(--sb-success\)/s);
  assert.match(source, /direction === "out".*var\(--sb-danger\)/s);
});

test("ledger filter summary wraps and stock balance action uses mobile radius token", () => {
  const ledger = read("src/app/(app)/stock-transactions/page.tsx");
  const balanceRows = read("src/components/stock-balance-table.tsx");

  assert.match(ledger, /sb-filter-summary flex-wrap px-3 py-2/);
  assert.match(balanceRows, /rounded-\[var\(--sb-radius-control\)\]/);
});
