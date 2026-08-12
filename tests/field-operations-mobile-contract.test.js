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

test("production jobs use the shared workspace status rail and reserve shared FAB clearance", () => {
  const source = read("src/app/(app)/production/jobs/page.tsx");

  assert.match(source, /<StatusTabs/);
  assert.match(source, /<WorkspaceGrid/);
  assert.match(source, /hideMobileConsole=\{!canCreate\}/);
  assert.doesNotMatch(source, /hidden flex-wrap gap-2 md:flex/);
  assert.doesNotMatch(source, /RightConsoleMount/);
});

test("stock count keeps setup separate from one continuous phone work surface", () => {
  const source = read("src/components/stock-count-form.tsx");
  const design = read("DESIGN.md");

  assert.match(source, /data-stock-count-setup/);
  assert.match(source, /data-stock-count-workspace/);
  assert.match(source, /data-stock-count-line-list/);
  assert.match(source, /border-b border-slate-100/);
  assert.match(source, /data-mobile-document-action/);
  assert.match(source, /aria-live="polite"/);
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
  const page = read("src/app/(app)/purchase-requests/new/page.tsx");

  assert.match(source, /data-purchase-request-setup/);
  assert.match(source, /data-purchase-request-workspace/);
  assert.match(source, /border-y border-\[var\(--sb-border\)\] bg-white/);
  assert.match(source, /adjustLineQuantity/);
  assert.match(source, /Add request line/);
  assert.match(source, /grid-cols-\[minmax\(0,1\.35fr\)_minmax\(0,0\.8fr\)_minmax\(4\.75rem,0\.7fr\)_2\.75rem\]/);
  assert.match(source, /Line note <span className="font-normal">\(optional\)<\/span>/);
  assert.match(source, /lines\.length > 1 \? <Button/);
  assert.match(page, /mobilePrimaryAction=\{primaryAction\}/);
  assert.doesNotMatch(source, /aria-label="Submit PR"/);
  assert.doesNotMatch(source, /hidden xl:hidden md:inline-flex/);
  assert.doesNotMatch(source, /md:rounded-md md:border md:bg-secondary\/20/);
});

test("stock transfer and wastage use compact mobile lines and hide fixed UOM fields", () => {
  const source = read("src/components/stock-operation-forms.tsx");
  const wastagePage = read("src/app/(app)/stock-wastage/new/page.tsx");

  assert.match(source, /data-stock-transfer-setup/);
  assert.match(source, /data-stock-wastage-setup/);
  assert.match(source, /data-stock-operation-lines/);
  assert.match(source, /grid grid-cols-2 gap-2 p-3/);
  assert.match(source, /<Field label="Quantity">/);
  assert.match(source, /name="line_uom" value=\{line\.uom\}/);
  assert.match(source, /More line details/);
  assert.doesNotMatch(source, /Field label="UOM"/);
  assert.match(wastagePage, /<WorkspaceGrid documentMode tabletRailMode="split"/);
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

test("outlet daily entry keeps three compact quantities in one phone row and reveals wastage details conditionally", () => {
  const source = read("src/components/outlet-daily-record-form.tsx");
  const page = read("src/app/(app)/outlet-daily-records/new/page.tsx");

  assert.match(source, /data-outlet-daily-setup/);
  assert.match(source, /data-outlet-daily-lines/);
  assert.match(source, /grid grid-cols-3 items-end gap-2 p-3/);
  assert.match(source, /showWastageDetails = Number\(wastage \|\| 0\) > 0/);
  assert.match(source, /className="h-10 min-w-0 px-2 text-center tabular-nums"/);
  assert.match(source, /required=\{Number\(wastage \|\| 0\) > 0\}/);
  assert.match(source, /setReason\("unsold"\)/);
  assert.match(source, /aria-label=\{`Add remarks for \$\{product\.product_name\}`\}/);
  assert.match(page, />Confirm Qty Sent<\/SubmitButton>/);
  assert.doesNotMatch(page, />Confirm Received<\/SubmitButton>/);
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
  assert.match(source, /hidden overflow-x-auto[\s\S]*md:block/);
  assert.match(source, /data-low-stock-pr-lines/);
  assert.match(source, /label="Qty for PR"/);
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

test("staff permission overrides use touch-friendly capability rows instead of a scrolling table", () => {
  const source = read("src/components/staff-permission-overrides.tsx");

  assert.match(source, /<details key=\{module\}/);
  assert.match(source, /grid gap-2 p-3 sm:grid-cols/);
  assert.match(source, /Technical details/);
  assert.match(source, /text-\[11px\]/);
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
