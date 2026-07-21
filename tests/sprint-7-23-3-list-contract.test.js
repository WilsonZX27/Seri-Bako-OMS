const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const routes = [
  "purchase-requests",
  "purchase-orders",
  "goods-receivings",
  "supplier-invoices",
  "stock-balance",
  "stock-transactions",
  "items",
  "production/jobs",
  "outlet-daily-records",
];

test("migrated operational lists share responsive, zero-safe contracts", () => {
  for (const route of routes) {
    const page = fs.readFileSync(`src/app/(app)/${route}/page.tsx`, "utf8");
    const source = route === "stock-balance"
      ? `${page}\n${fs.readFileSync("src/components/stock-balance-workspace.tsx", "utf8")}`
      : page;
    assert.match(source, /<FilterBar|<MasterDataFilters/, `${route} uses the canonical filter`);
    assert.match(source, /<Table mobileHidden/, `${route} hides its semantic table on mobile`);
    assert.match(source, /<OperationalList/, `${route} provides a mobile operational list`);
    assert.doesNotMatch(source, /overflow-x-auto/, `${route} has no one-off table wrapper`);
  }

  const pagination = fs.readFileSync("src/components/sortable-table.tsx", "utf8");
  assert.match(pagination, /if \(totalRows === 0\) return null/);
  const sidebar = fs.readFileSync("src/components/layout/sidebar.tsx", "utf8");
  assert.match(sidebar, /xl:block/);
});
