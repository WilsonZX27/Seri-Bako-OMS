const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");
const routes = [
  "purchase-requests", "purchase-orders", "goods-receivings", "supplier-invoices", "purchase-returns",
  "documents", "items", "products", "suppliers", "supplier-items", "stock-balance", "stock-transactions",
  "stock-transfers", "stock-counts", "stock-wastage", "production/jobs", "outlet-daily-records", "recipes",
];

test("every operational list uses the canonical desktop, tablet, and mobile surfaces", () => {
  for (const route of routes) {
    const page = read(`src/app/(app)/${route}/page.tsx`);
    const source = route === "stock-balance" ? `${page}\n${read("src/components/stock-balance-workspace.tsx")}` : page;
    assert.match(source, /PageHeader/, `${route}: PageHeader`);
    assert.match(source, /FilterBar|MasterDataFilters/, `${route}: FilterBar`);
    assert.match(source, /<Table(?=[^>]*\bmobileHidden\b)(?=[^>]*aria-label=)/, `${route}: responsive Table`);
    assert.match(source, /OperationalList/, `${route}: mobile OperationalList`);
    assert.match(source, /EmptyState/, `${route}: EmptyState`);
    assert.match(source, /PaginationControls/, `${route}: Pagination`);
    assert.match(source, /WorkspaceGrid|RightConsoleMount/, `${route}: Right Console`);
    assert.doesNotMatch(route === "stock-balance" ? page : source, /overflow-x-auto|SelectNative|Page actions/i, `${route}: legacy list wrapper/control`);
  }
});

test("shared list controls own overflow, elevation, More Filters, and zero-result pagination", () => {
  const table = read("src/components/ui/table.tsx");
  const filters = read("src/components/ui/filter-bar.tsx");
  const pagination = read("src/components/sortable-table.tsx");
  const styles = read("src/app/globals.css");
  const select = read("src/components/ui/select-control.tsx");

  assert.match(table, /sb-table-region/);
  assert.match(styles, /\.sb-table-region \{[\s\S]*overflow-x: auto/);
  assert.match(styles, /html,[\s\S]*body \{[\s\S]*overflow-x: hidden/);
  assert.match(filters, /More filters/);
  assert.match(filters, /Changes take effect after you select Apply/);
  assert.match(select, /Select\.Portal/);
  assert.match(select, /var\(--sb-z-dropdown\)/);
  assert.match(pagination, /if \(totalRows === 0\) return null/);
});

test("breadcrumbs prefetch only canonical group workspaces", () => {
  const breadcrumbs = read("src/components/layout/breadcrumbs.tsx");

  assert.match(breadcrumbs, /procurement: "\/procurement"/);
  assert.match(breadcrumbs, /inventory: "\/inventory"/);
  assert.doesNotMatch(breadcrumbs, /`\/\$\{iaItem\.group\}`/);
});

test("product-driven lists keep canonical ordering and the current footer", () => {
  const products = read("src/server/queries/products.ts");
  const recipes = read("src/server/queries/recipes.ts");
  const daily = read("src/server/queries/outlet-daily-records.ts");
  const order = read("src/lib/product-order.ts");
  const version = read("src/lib/app-version.ts");

  assert.match(products, /sortProductsForDisplay/);
  assert.match(recipes, /sortProductsForDisplay/);
  assert.match(daily, /sortProductsForDisplay/);
  assert.match(order, /display_order/);
  assert.match(order, /natural\.compare/);
  assert.match(version, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
});
