const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(root, ...segments), "utf8");

test("dashboard panels retain their hierarchy without a nested sage canvas", () => {
  const dashboard = read("src", "components", "dashboard-workspace.tsx");
  const design = read("src", "app", "design-system-v2.css");
  assert.match(dashboard, /data-dashboard-panel-body/);
  assert.match(dashboard, /gap-y-1 px-3 py-2\.5/);
  assert.match(design, /\[data-dashboard-panel\] > :last-child\s*\{[\s\S]*padding:\s*0\.5rem;[\s\S]*background:\s*var\(--sb-surface-raised\)/);
  assert.match(design, /\[data-dashboard-panel\] > :first-child\s*\{[\s\S]*background:\s*var\(--sb-surface-raised\)/);
  assert.match(design, /\[data-dashboard-panel="today"\] > :first-child\s*\{[\s\S]*background:\s*#fff7d6/);
  assert.match(dashboard, /title="Today's completion" dataAttribute="today"/);
  assert.match(design, /\[data-dashboard-attention-summary\]\s*\{[\s\S]*background:\s*var\(--sb-green-900\)/);
  assert.match(design, /\[data-dashboard-layout\]\s*\{[\s\S]*min-width:\s*0/);
  assert.doesNotMatch(design, /\[data-dashboard-layout\]\s*\{[\s\S]{0,160}background:/);
  assert.match(dashboard, /grid-cols-\[auto_minmax\(0,1fr\)\] grid-rows-\[auto_auto\]/);
  assert.match(dashboard, /col-span-2 row-start-2/);
  assert.match(dashboard, /grid grid-cols-3 divide-x[^\n]+data-dashboard-quick-actions/);
  assert.doesNotMatch(dashboard, /data-dashboard-quick-actions[\s\S]{0,900}hover:-translate-y/);
});

test("item combobox stays in the shared modal stacking context", () => {
  const combobox = read("src", "components", "item-combobox.tsx");
  const recovery = read("src", "components", "purchase-request-line-recovery.tsx");
  const addLine = read("src", "components", "add-purchase-request-line-dialog.tsx");
  assert.match(combobox, /anchorRef\.current\?\.closest\("\[data-modal-shell\]"\) \?\? document\.body/);
  assert.match(combobox, /data-item-combobox-listbox/);
  assert.match(recovery, /overflow-visible/);
  assert.match(addLine, /overflow-visible/);
});

test("review line dialogs expose purchase quantity and UOM before selection", () => {
  const recovery = read("src", "components", "purchase-request-line-recovery.tsx");
  const addLine = read("src", "components", "add-purchase-request-line-dialog.tsx");
  assert.match(recovery, /Field label="Purchase quantity \/ UOM"/);
  assert.match(recovery, /disabled=\{!itemId\}/);
  assert.match(addLine, />Purchase qty<Input/);
  assert.match(addLine, />UOM<SelectNative/);
  assert.match(addLine, /overflow-y-auto/);
});

test("tablet documents use page scrolling and commercial cost sits below purchase qty", () => {
  const design = read("src", "app", "design-system-v2.css");
  const detail = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  assert.match(design, /@media \(max-width: 1279px\)[\s\S]*main#main-content\s*\{[\s\S]*overflow-x:\s*clip/);
  assert.match(detail, /<div className="text-right"><p className="font-semibold">\{formatNumber\(line\.qty\)\} \{line\.uom\}<\/p>\{canViewCommercial \? <p/);
});

test("localhost polish keeps tablet fields readable and zero movement compact", () => {
  const forms = read("src", "components", "procurement-forms.tsx");
  const chart = read("src", "components", "reports", "inventory-daily-movement-chart.tsx");
  const runner = read("tests", "e2e", "v9-full-system-uat.spec.js");
  assert.match(forms, /grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4/);
  assert.match(chart, /!points\.length \|\| totals\.all === 0/);
  assert.match(runner, /unreachableHorizontalScroll/);
  assert.doesNotMatch(runner, /hidden scrollbars require an edge affordance/);
});
