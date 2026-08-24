const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("PR register and Dashboard use the same labelled operational tracks", () => {
  const register = read("src", "app", "(app)", "purchase-requests", "page.tsx");
  const dashboard = read("src", "components", "dashboard-workspace.tsx");
  for (const source of [register, dashboard]) {
    assert.match(source, /data-pr-context-grid/);
    assert.match(source, /data-pr-metrics-grid/);
    for (const label of ["Location", "Supplier", "Date", "User", "Items", "Est. cost"]) assert.match(source, new RegExp(`>${label}<`));
  }
});

test("Stock Count retirement is owned by a More menu below the ordinal", () => {
  const source = read("src", "components", "stock-count-form.tsx");
  assert.match(source, /TableActionMenuPortal label=\{`More options for/);
  assert.match(source, /line\.retireAfterCount \? "Keep active" : "Retire after this count"/);
  assert.doesNotMatch(source, /<Archive[^>]*\/>Retire after this count/);
});

test("Movement Ledger has an explicit readable column authority", () => {
  const page = read("src", "app", "(app)", "stock-transactions", "page.tsx");
  const css = read("src", "app", "design-system-v2.css");
  assert.match(page, /className="sb-stock-movement-ledger"/);
  assert.match(css, /\.sb-stock-movement-ledger \{[\s\S]*?min-width: 85rem;[\s\S]*?table-layout: fixed;/);
});

test("document action hierarchy and PO attachments use the final shared grammar", () => {
  const pr = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  const po = read("src", "app", "(app)", "purchase-orders", "[id]", "page.tsx");
  const danger = read("src", "components", "ui", "danger-confirm-form.tsx");
  assert.match(pr, /cancelPurchaseRequest[\s\S]*?variant="outline"/);
  assert.doesNotMatch(po, /You can view this document, but there is no workflow action available/);
  assert.match(po, /title="Supporting Attachments" uploadLabel="Upload"/);
  assert.doesNotMatch(po, /defaultLabel="Purchase Order"/);
  assert.doesNotMatch(danger, />Confirm<\/span>/);
});

test("footer version and product evidence remain synchronized", () => {
  assert.match(read("PRODUCT.md"), /v8\.64\.169/);
  assert.match(read("DESIGN.md"), /v8\.64\.169/);
  assert.match(read("docs", "ANNOTATION-REPAIR-LEDGER-2026-08-19.md"), /final operational refinement — v8\.64\.169/);
});
