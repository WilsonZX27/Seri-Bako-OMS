const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

test("new document headers align status left and workflow right without repeating the document title", () => {
  const workspace = read("src/components/documents/document-workspace.tsx");

  assert.match(workspace, /isNewDocument && !hideWorkflow/);
  assert.match(workspace, /!hideWorkflow && !hideMobileWorkflow/);
  assert.match(workspace, /justify-between gap-2 md:hidden/);
  assert.match(workspace, /<StatusBadge status=\{status\}/);
  assert.match(workspace, /isNewDocument && "hidden md:flex"/);
});

test("mobile document actions keep their slots full width", () => {
  const css = read("src/app/design-system-v2.css");

  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /> :only-child \{\s*grid-column: 1 \/ -1/);
  assert.doesNotMatch(css, /\[data-mobile-document-action\][^{]+> :last-child button \{[^}]*width: auto !important/s);
});

test("dense creation forms avoid nested card shells and use responsive field grids", () => {
  const purchaseOrder = read("src/components/procurement-forms.tsx");
  const invoice = read("src/components/supplier-invoice-form.tsx");
  const purchaseReturn = read("src/components/purchase-return-form.tsx");
  const production = read("src/components/production-job-form.tsx");

  assert.match(purchaseOrder, /data-purchase-order-setup[^>]+grid grid-cols-2/);
  assert.match(invoice, /data-supplier-invoice-setup[^>]+grid grid-cols-2/);
  assert.match(purchaseReturn, /grid grid-cols-2 gap-3 lg:grid-cols-3/);
  assert.match(production, /CardContent className="grid grid-cols-3 gap-3/);
});

test("goods receiving uses one collapsible setup instead of a nested details disclosure", () => {
  const receiving = read("src/components/goods-receiving-form.tsx");

  assert.match(receiving, /setupOpen/);
  assert.doesNotMatch(receiving, /More receiving details/);
});
