import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const designSystem = fs.readFileSync("src/app/design-system-v2.css", "utf8");

test("v9 table motion uses the shared token and preserves reduced-motion behavior", () => {
  assert.match(designSystem, /tbody tr\s*\{\s*transition:\s*background-color var\(--sb-motion-fast\) ease,\s*box-shadow var\(--sb-motion-fast\) ease;/);
  assert.match(designSystem, /\[data-mobile-bottom-nav\] :where\(a, button\)[\s\S]*transition: background-color var\(--sb-motion-fast\) ease/);
  assert.match(designSystem, /@media \(prefers-reduced-motion: reduce\)/);
});

test("v9 dashboard identity and panel headings use shared type tokens", () => {
  const globals = fs.readFileSync("src/app/globals.css", "utf8") + fs.readFileSync("src/app/design-system-v2.css", "utf8");
  assert.match(globals, /--sb-text-identity:\s*1\.25rem/);
  assert.match(globals, /--sb-text-section:\s*0\.875rem/);
  assert.doesNotMatch(globals, /--sb-text-(?:display|identity|title|page|section):\s*clamp\(/);
  assert.match(designSystem, /\[data-dashboard-user-name\][\s\S]*font-size: var\(--sb-text-identity\)/);
  assert.match(designSystem, /\[data-dashboard-panel\] > :first-child[\s\S]*font-size: var\(--sb-text-section\)/);
});

test("v9 surfaces and overlays use semantic color and layer tokens", () => {
  const globals = fs.readFileSync("src/app/globals.css", "utf8") + fs.readFileSync("src/app/design-system-v2.css", "utf8");
  const upload = fs.readFileSync("src/components/documents/attachment-upload-form.tsx", "utf8");
  const procurement = fs.readFileSync("src/components/procurement-forms.tsx", "utf8");
  assert.match(globals, /--sb-surface-subtle:\s*#fafafa/);
  assert.match(upload, /text-\[var\(--sb-text-muted\)\]/);
  assert.match(procurement, /bg-\[var\(--sb-surface-subtle\)\]/);
  assert.match(designSystem, /\.unified-list-layer \{[^}]*z-index: var\(--sb-z-sheet-backdrop\)/);
  assert.match(designSystem, /\.unified-list-sheet \{[^}]*z-index: var\(--sb-z-sheet\)/);
  assert.doesNotMatch(designSystem, /\.unified-list-(?:layer|backdrop|sheet) \{[^}]*z-index: 10[01]/);
});

test("v9 elevation uses defined semantic shadows for panels, rails, and dialogs", () => {
  const purchaseOrders = fs.readFileSync("src/app/(app)/purchase-orders/page.tsx", "utf8");
  const stockCountExport = fs.readFileSync("src/components/stock-count-export-dialog.tsx", "utf8");
  assert.match(designSystem, /--sb-shadow-panel:\s*var\(--sb-shadow-sm\)/);
  assert.match(designSystem, /--sb-shadow-lg:\s*0 -8px 24px/);
  // The shared PageHeader owns the create FAB; a route-local FAB overlaps it.
  assert.match(purchaseOrders, /<PageHeader/);
  assert.doesNotMatch(purchaseOrders, /className="fixed bottom-/);
  assert.match(stockCountExport, /shadow-\[var\(--sb-shadow-md\)\]/);
  assert.doesNotMatch(purchaseOrders, /shadow-\[0_8px_24px/);
  assert.doesNotMatch(stockCountExport, /shadow-\[0_8px_24px/);
});
