const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const globals = fs.readFileSync(path.join(root, "src", "app", "globals.css"), "utf8");
const design = fs.readFileSync(path.join(root, "src", "app", "design-system-v2.css"), "utf8");
const table = fs.readFileSync(path.join(root, "src", "components", "ui", "table.tsx"), "utf8");
const mobileDocumentSurfaces = fs.readFileSync(path.join(root, "src", "components", "documents", "mobile-document-surfaces.tsx"), "utf8");
const procurementForms = fs.readFileSync(path.join(root, "src", "components", "procurement-forms.tsx"), "utf8");
const inventoryDailyMovementChart = fs.readFileSync(path.join(root, "src", "components", "reports", "inventory-daily-movement-chart.tsx"), "utf8");
const supplierInvoiceAging = fs.readFileSync(path.join(root, "src", "app", "(app)", "supplier-invoices", "aging", "page.tsx"), "utf8");

test("v9 keeps hidden scrollbars without edge gradients or scroll-state decoration", () => {
  assert.match(globals, /:where\(\[class\*="overflow-auto"[\s\S]*scrollbar-width:\s*none/);
  assert.match(globals, /::-webkit-scrollbar\s*\{[\s\S]*display:\s*none/);
  assert.doesNotMatch(design, /\.sb-table-region\[data-overflow-state=/);
  assert.doesNotMatch(table, /data-overflow-state|ResizeObserver|scrollWidth - region\.clientWidth/);
  assert.doesNotMatch(globals, /data-scrolled="true"[\s\S]{0,400}box-shadow/);
});

test("v9 typography uses fixed steps and medium-weight identity headings", () => {
  assert.match(globals, /--sb-text-display:\s*1\.5rem/);
  assert.match(globals, /--sb-text-identity:\s*1\.25rem/);
  assert.doesNotMatch(globals, /--sb-text-(?:display|identity):\s*clamp\(/);
  assert.match(design, /\[data-page-header\] h1\s*\{[\s\S]*?font-weight:\s*500/);
  assert.match(design, /\[data-dashboard-user-name\]\s*\{[\s\S]*?font-weight:\s*500/);
  assert.match(design, /\[data-dashboard-panel\][\s\S]*?font-weight:\s*500/);
});

test("v9 motion stays purposeful and respects reduced-motion preferences", () => {
  assert.match(globals, /--sb-motion-fast:\s*160ms/);
  assert.match(globals, /--sb-motion-standard:\s*220ms/);
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration:\s*0\.01ms/);
});

test("v9 mobile workflow controls use the shared touch target", () => {
  assert.match(mobileDocumentSurfaces, /triggerClassName="h-\[var\(--sb-control-height\)\] min-h-\[var\(--sb-control-height\)\][^\"]*text-\[12px\]/);
  assert.doesNotMatch(mobileDocumentSurfaces, /triggerClassName="h-8 min-h-8[^\"]*Step/);
});

test("v9 purchase request compact actions retain practical mobile touch targets", () => {
  assert.match(procurementForms, /className="h-9 w-9 shrink-0"[^>]*aria-expanded=\{detailsOpen\}/);
  assert.match(procurementForms, /className="h-9 px-2\.5"[^>]*aria-label="Add request line"/);
  assert.match(procurementForms, /className="h-9 w-9 shrink-0"[^>]*aria-label=\{detailsOpen \? "Collapse order details"/);
});

test("v9 expandable report summaries retain a practical mobile touch target", () => {
  assert.match(inventoryDailyMovementChart, /<summary className="flex min-h-9 cursor-pointer items-center/);
});

test("v9 AP aging definitions stay scannable in the primary workspace", () => {
  assert.match(supplierInvoiceAging, /Overdue starts one day after the due date/);
  assert.match(supplierInvoiceAging, /Scope: Open or Partially Paid invoices/);
  assert.doesNotMatch(supplierInvoiceAging, /followed by 91\+ day critical balances/);
});
