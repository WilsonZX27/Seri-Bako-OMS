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
  assert.match(source, /data-stock-count-line/);
  assert.match(source, /\{visibleLines\.length\}<\/strong> items shown/);
  assert.match(source, /aria-label=\{`Item \$\{lineIndex \+ 1\}`\}/);
  assert.match(source, /line\.adjusted \? "bg-\[var\(--sb-green-100\)\]"/);
  assert.match(source, /lg:grid-cols-\[minmax\(12rem,1fr\)_5rem_minmax\(14rem,17rem\)\]/);
  assert.match(source, /border-b border-\[var\(--sb-border-soft\)\]/);
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
  const css = read("src/app/design-system-v2.css");

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
  assert.doesNotMatch(css, /#purchase-request-form \[data-purchase-request-line\] \{[\s\S]{0,160}grid-template-columns/);
  assert.match(source, /<Field label="Item comment" className="col-span-full">/);
});

test("stock transfer and wastage use searchable compact lines with one setup disclosure", () => {
  const source = read("src/components/stock-operation-forms.tsx");
  const actions = read("src/server/actions/stock-operations.ts");
  const wastagePage = read("src/app/(app)/stock-wastage/new/page.tsx");

  assert.match(source, /data-stock-transfer-setup/);
  assert.match(source, /data-stock-wastage-setup/);
  assert.match(source, /data-stock-operation-lines/);
  assert.match(source, /data-stock-operation-line-details/);
  assert.match(source, /selectedItems\.has\(line\.item_id\)/);
  assert.match(source, /className=\{selected \? "contents" : "hidden"\}/);
  assert.match(source, /\{selected \? <Button/);
  assert.match(source, /grid grid-cols-2 gap-2 p-3/);
  assert.match(source, /<Field label="Quantity"/);
  assert.match(source, /name="line_uom" value=\{line\.uom\}/);
  assert.match(source, /placeholder="Search item code or name"/);
  assert.match(source, /aria-label=\{`Notes for \$\{line\.item_name\}`\}/);
  assert.match(source, /<details open data-stock-transfer-setup/);
  assert.match(source, /<details open data-stock-wastage-setup/);
  assert.doesNotMatch(source, /More line details/);
  assert.doesNotMatch(source, /Add transfer remarks|Add evidence note/);
  assert.doesNotMatch(source, /Field label="UOM"/);
  assert.match(wastagePage, /<DocumentWorkspace/);
  assert.match(wastagePage, /workflowSteps={steps}/);
  assert.match(wastagePage, /currentStatus="draft"/);
  assert.equal((actions.match(/enabled\.has\(line\.item_id\)/g) ?? []).length, 2);
});

test("goods receiving detail replaces the ten-column phone table with a complete audit summary", () => {
  const source = read("src/app/(app)/goods-receivings/[id]/page.tsx");
  const browser = read("tests/e2e/goods-receiving-detail-responsive.spec.js");

  assert.match(source, /<Table mobileHidden aria-label="Received items">/);
  assert.match(source, /data-goods-receiving-detail-lines/);
  assert.match(source, /role="list" aria-label="Received items"/);
  assert.match(source, />Received<\/p>/);
  assert.match(source, />Ordered<\/dt>/);
  assert.match(source, />Previously<\/dt>/);
  assert.match(source, />Pending<\/dt>/);
  assert.match(source, /excluded from stock/);
  assert.match(source, /Batch \{line\.batch_no/);
  assert.match(source, /Stock value \{formatCurrency/);
  assert.match(browser, /mobile-390/);
  assert.match(browser, /tablet-820/);
  assert.match(browser, /laptop-1180/);
  assert.match(browser, /desktop-1440/);
  assert.match(browser, /await expect\(table\)\.toBeHidden\(\)/);
});

test("procurement read-only details preserve reconciliation fields without narrow tables", () => {
  const purchaseReturn = read("src/app/(app)/purchase-returns/[id]/page.tsx");
  const supplierInvoice = read("src/app/(app)/supplier-invoices/[id]/page.tsx");

  assert.match(purchaseReturn, /<Table mobileHidden aria-label="Returned items">/);
  assert.match(purchaseReturn, /data-purchase-return-detail-lines/);
  assert.match(purchaseReturn, />Returnable before this<\/dt>/);
  assert.match(purchaseReturn, /Number\(line\.received_qty\) - Number\(line\.previously_returned_qty\)/);
  assert.match(supplierInvoice, /<Table mobileHidden aria-label="Invoice matching lines">/);
  assert.match(supplierInvoice, /data-supplier-invoice-detail-lines/);
  assert.match(supplierInvoice, />Available before invoice<\/dt>/);
  assert.match(supplierInvoice, /Qty variance \{formatNumber\(qtyVariance\)\}/);
  assert.match(supplierInvoice, /<Table mobileHidden aria-label="Payment history">/);
  assert.match(supplierInvoice, /data-supplier-invoice-payment-list/);
});

test("stock count responsive audit keeps one status and medium-width stacking", () => {
  const source = read("tests/e2e/stock-count-create-responsive.spec.js");

  assert.match(source, /mobile-390/);
  assert.match(source, /tablet-820/);
  assert.match(source, /laptop-1180/);
  assert.match(source, /data-document-status-only/);
  assert.doesNotMatch(source, /View workflow, step 1 of 2/);
  assert.match(source, /geometry\.countTop/);
  assert.match(source, /boxShadow/);
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
  assert.match(source, /data-supplier-invoice-line-editor/);
  assert.match(source, /Select at least one receiving line before saving the invoice\./);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /\{line \? <div data-supplier-invoice-line-editor>/);
  assert.doesNotMatch(source, /data-supplier-invoice-grn className="erp-surface/);
  assert.match(source, /data-supplier-invoice-grn className="overflow-hidden border-y/);
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
  assert.match(source, /function selectBranch\(branchId: string\)/);
  assert.match(source, /setSelected\(\{\}\)/);
  assert.match(source, /Choose one branch before selecting items for a purchase request\./);
  assert.match(source, /disabled=\{!branchSelected\}/);
  assert.match(source, /data-low-stock-pr-line data-selected=/);
  assert.match(source, /data-low-stock-pr-quantity/);
  assert.match(source, /\{isSelected \? <span className="col-span-2"/);
  assert.match(source, /label="Qty for PR"/);
  assert.match(source, /Suggested <strong/);
  assert.match(source, /bg-\[var\(--sb-green-900\)\]/);
  assert.doesNotMatch(source, /var\(--sb-green\)/);
});

test("posted production and stock count details keep reconciliation authority off narrow tables", () => {
  const production = read("src/app/(app)/production/jobs/[id]/page.tsx");
  const stockCount = read("src/app/(app)/stock-counts/[id]/page.tsx");

  assert.match(production, /<Table mobileHidden aria-label="Ingredient consumption">/);
  assert.match(production, /data-production-job-ingredient-list/);
  assert.match(production, />Required<\/dt>/);
  assert.match(production, />Available<\/dt>/);
  assert.match(production, />Variance<\/dt>/);
  assert.match(production, /<Table mobileHidden aria-label="Production outputs">/);
  assert.match(production, /data-production-job-output-list/);
  assert.match(stockCount, /<Table mobileHidden aria-label="Posted stock count lines">/);
  assert.match(stockCount, /data-posted-stock-count-lines/);
  assert.match(stockCount, /Math\.abs\(line\.variance_percent\) > count\.tolerance_percent/);
  assert.match(stockCount, /Variance exceeds tolerance; remarks were not recorded/);
});

test("remaining operational details replace narrow audit tables without dropping authority", () => {
  const recipe = read("src/app/(app)/recipes/[id]/page.tsx");
  const transfer = read("src/app/(app)/stock-transfers/[id]/page.tsx");
  const wastage = read("src/app/(app)/stock-wastage/[id]/page.tsx");
  const ledger = read("src/app/(app)/stock-transactions/[id]/page.tsx");

  assert.match(recipe, /<Table mobileHidden aria-label="Recipe ingredient availability">/);
  assert.match(recipe, /data-recipe-ingredient-detail-list/);
  assert.match(recipe, /line\.current_stock == null \? "Unknown"/);
  assert.match(recipe, /line\.shortage_qty == null \? "Unavailable"/);
  assert.match(transfer, /<Table mobileHidden aria-label="Transfer lines">/);
  assert.match(transfer, /data-stock-transfer-detail-lines/);
  assert.match(transfer, /Math\.max\(Number\(line\.quantity\) - received, 0\)/);
  assert.match(wastage, /<Table mobileHidden aria-label="Wastage lines">/);
  assert.match(wastage, /data-stock-wastage-detail-lines/);
  assert.match(wastage, /line\.batch_no \?\? "No batch"/);
  assert.match(ledger, /data-ledger-movement-detail/);
  assert.match(ledger, /transaction\.quantity_in > 0 \? `\+\$\{formatNumber/);
  assert.doesNotMatch(ledger, /<Table/);
});

test("supplier invoice responsive audit verifies flat selected-line disclosure", () => {
  const source = read("tests/e2e/supplier-invoice-create-responsive.spec.js");

  assert.match(source, /mobile-390/);
  assert.match(source, /tablet-820/);
  assert.match(source, /laptop-1180/);
  assert.match(source, /data-supplier-invoice-line-editor/);
  assert.match(source, /erp-surface \[data-supplier-invoice-grn\]\.erp-surface/);
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
  assert.match(source, /col-span-2 grid grid-cols-2 gap-3 border-y py-4/);
  assert.match(source, /border-y py-4 md:col-span-2/);
});

test("supplier master uses a flat phone submit boundary", () => {
  const source = read("src/components/supplier-form.tsx");

  assert.match(source, /border-0 bg-transparent shadow-none md:border/);
  assert.match(source, /border-t px-0 py-3 md:border-0 md:p-3/);
});
