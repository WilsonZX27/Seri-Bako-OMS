const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("outlet daily rows retain the next operational step and wastage signal on phones", () => {
  const source = read("src/app/(app)/outlet-daily-records/page.tsx");

  assert.match(source, /statusGuidance\(row\.status\)/);
  assert.match(source, /row\.total_wastage > 0/);
  assert.match(source, /formatNumber\(row\.total_received\)\} received/);
});

test("production jobs use the shared mobile status rail and reserve FAB clearance", () => {
  const source = read("src/app/(app)/production/jobs/page.tsx");

  assert.match(source, /<StatusTabs/);
  assert.match(source, /className="md:hidden"/);
  assert.match(source, /hidden flex-wrap gap-2 md:flex/);
  assert.match(source, /canCreate \? "pb-32" : "pb-4"/);
});

test("stock count keeps setup separate from one continuous phone work surface", () => {
  const source = read("src/components/stock-count-form.tsx");
  const design = read("DESIGN.md");

  assert.match(source, /data-stock-count-setup/);
  assert.match(source, /data-stock-count-workspace/);
  assert.match(source, /data-stock-count-line-list/);
  assert.match(source, /border-b border-\[var\(--sb-border-soft\)\]/);
  assert.match(design, /A phone workflow uses one boundary per operational unit/);
  assert.match(design, /Do not place a bordered or shadowed card inside another card/);
  assert.match(design, /multi-column editable desktop table must not be the primary phone input/);
  assert.match(design, /Do not use a horizontally scrolling table as a substitute for a phone line-entry layout/);
});

test("goods receiving prioritizes physical receipt before reference quantities on phones", () => {
  const source = read("src/components/goods-receiving-form.tsx");

  assert.match(source, /data-goods-receiving-setup/);
  assert.match(source, /data-goods-receiving-workspace/);
  assert.match(source, /label="Received" required className="order-2/);
  assert.match(source, /label="Rejected" className="order-2/);
  assert.match(source, /label="Ordered" className="order-3/);
  assert.match(source, /label="Prev\. Received" className="order-3/);
  assert.match(source, /label="Pending" className="order-4/);
});

test("purchase requests use a flat phone setup and line-entry hierarchy", () => {
  const source = read("src/components/procurement-forms.tsx");

  assert.match(source, /data-purchase-request-setup/);
  assert.match(source, /data-purchase-request-workspace/);
  assert.match(source, /details className="md:col-span-4 border-t/);
  assert.match(source, /md:rounded-md md:border md:bg-secondary\/20/);
});

test("stock transfer and wastage use a flat mobile line surface with quantity before availability", () => {
  const source = read("src/components/stock-operation-forms.tsx");

  assert.match(source, /data-stock-transfer-setup/);
  assert.match(source, /data-stock-wastage-setup/);
  assert.match(source, /data-stock-operation-lines/);
  assert.match(source, /Field label="Quantity" className="order-2/);
  assert.match(source, /className="order-3 bg-\[var\(--sb-surface-muted\)\]/);
});

test("production ingredient snapshots replace the phone table with a scannable list", () => {
  const source = read("src/components/production-job-form.tsx");

  assert.match(source, /sb-table-region hidden rounded-\[2px\] border md:block/);
  assert.match(source, /data-production-ingredient-list/);
  assert.match(source, /grid grid-cols-2 gap-x-4 gap-y-2 text-xs/);
  assert.match(source, /CardContent className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4/);
});

test("supplier invoice matching uses editable phone lines instead of a nine-column table", () => {
  const source = read("src/components/supplier-invoice-form.tsx");

  assert.match(source, /data-supplier-invoice-setup/);
  assert.match(source, /data-supplier-invoice-grn/);
  assert.match(source, /sb-table-region hidden md:block/);
  assert.match(source, /data-supplier-invoice-line-list/);
  assert.match(source, /Field label="Invoice Qty"/);
  assert.match(source, /grid grid-cols-2 gap-3 bg-secondary\/30 p-3 text-sm/);
});

test("outlet daily entry uses a stable phone line grid without nested card boundaries", () => {
  const source = read("src/components/outlet-daily-record-form.tsx");

  assert.match(source, /data-outlet-daily-setup/);
  assert.match(source, /data-outlet-daily-lines/);
  assert.match(source, /grid grid-cols-2 gap-3 p-3/);
  assert.match(source, /label className="col-span-2 grid gap-1 text-xs"/);
});

test("recipe BOM editing replaces the phone table with input-first continuous ingredient lines", () => {
  const source = read("src/components/recipe-form.tsx");

  assert.match(source, /data-recipe-setup/);
  assert.match(source, /sb-table-region hidden overflow-x-auto rounded-\[2px\] border md:block/);
  assert.match(source, /data-recipe-ingredient-list/);
  assert.match(source, /placeholder="Ingredient code or name"/);
  assert.match(source, /label="Qty required"/);
  assert.match(source, /label="Conversion factor"/);
  assert.match(source, /label="Base UOM"/);
  assert.match(source, /label="Cost \/ base"/);
  assert.match(source, /grid grid-cols-2 gap-x-4 gap-y-2 bg-secondary\/30 p-3 text-xs/);
});

test("low-stock PR creation uses selectable phone rows instead of a five-column table", () => {
  const source = read("src/components/low-stock-pr-form.tsx");

  assert.match(source, /data-low-stock-pr-setup/);
  assert.match(source, /hidden overflow-x-auto rounded-\[2px\] border md:block/);
  assert.match(source, /data-low-stock-pr-lines/);
  assert.match(source, /label="Qty for PR" className="col-span-2"/);
  assert.match(source, /Suggested <strong/);
});

test("purchase returns lead with the return quantity before read-only stock references on phones", () => {
  const source = read("src/components/purchase-return-form.tsx");

  assert.match(source, /data-purchase-return-lines/);
  assert.match(source, /label="Return Qty" required className="order-2 xl:order-none"/);
  assert.match(source, /label="Returnable" className="order-3 xl:order-none"/);
  assert.match(source, /label="Received" className="order-3 xl:order-none"/);
  assert.match(source, /label="Reason" className="col-span-2 order-4/);
});

test("production variance retains a compact signal list on phones", () => {
  const source = read("src/app/(app)/production/variance/page.tsx");

  assert.match(source, /<Table mobileHidden aria-label="Production versus outlet demand variance"/);
  assert.match(source, /data-production-variance-list/);
  assert.match(source, /grid grid-cols-2 gap-x-4 gap-y-2 text-xs/);
});

test("stock adjustments use a flat phone setup and keep quantity before cost and notes", () => {
  const source = read("src/components/stock-transaction-form.tsx");

  assert.match(source, /data-stock-transaction-setup/);
  assert.match(source, /label="Quantity in Base Unit" className="order-2"/);
  assert.match(source, /label="Unit Cost" className="order-3"/);
  assert.match(source, /className="order-4 md:col-span-3"/);
});

test("costing readiness reports use severity-first phone issue rows", () => {
  const source = read("src/app/(app)/reports/costing-readiness/page.tsx");

  assert.match(source, /<Table mobileHidden aria-label="Costing readiness issues"/);
  assert.match(source, /data-costing-readiness-list/);
  assert.match(source, /Open record/);
});

test("role permissions use touch-friendly phone capability rows instead of a scrolling table", () => {
  const source = read("src/components/role-permission-matrix.tsx");

  assert.match(source, /hidden overflow-x-auto border-t md:block/);
  assert.match(source, /data-role-permission-list/);
  assert.match(source, /min-h-14 items-start gap-3 p-3/);
  assert.match(source, /break-all text-\[11px\]/);
});

test("product master editing avoids nested card boundaries on phones", () => {
  const source = read("src/components/product-form.tsx");

  assert.match(source, /data-product-setup/);
  assert.match(source, /border-0 bg-transparent shadow-none md:border/);
  assert.match(source, /border-y bg-secondary\/30 py-4 md:col-span-2/);
  assert.match(source, /border-y py-4 md:col-span-2/);
});

test("supplier master uses a flat phone submit boundary", () => {
  const source = read("src/components/supplier-form.tsx");

  assert.match(source, /border-0 bg-transparent shadow-none md:border/);
  assert.match(source, /border-t px-0 py-3 md:border-0 md:p-3/);
});
