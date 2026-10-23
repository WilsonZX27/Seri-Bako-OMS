const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("business mutation entry points expose a pending/disabled submit contract", () => {
  const files = [
    "src/app/(app)/company/page.tsx",
    "src/app/(app)/branches/new/page.tsx",
    "src/app/(app)/items/new/page.tsx",
    "src/app/(app)/goods-receivings/new/page.tsx",
    "src/app/(app)/purchase-orders/new/page.tsx",
    "src/app/(app)/purchase-returns/new/page.tsx",
    "src/app/(app)/recipes/new/page.tsx",
    "src/app/(app)/staffs/new/page.tsx",
    "src/app/(app)/suppliers/new/page.tsx",
    "src/components/low-stock-pr-form.tsx",
    "src/components/stock-balance-workspace.tsx",
    "src/components/master-data-forms.tsx",
    "src/components/product-form.tsx",
    "src/components/recipe-form.tsx",
    "src/components/bulk-selection.tsx",
  ];

  for (const file of files) {
    const source = read(file);
    assert.match(source, /SubmitButton/, `${file} must use the shared pending submit control`);
    assert.match(source, /pendingLabel=/, `${file} must provide contextual pending copy`);
  }
});

test("shared submit control disables repeated activation and exposes busy state", () => {
  const source = read("src/components/ui/submit-button.tsx");
  assert.match(source, /disabled=\{disabled \|\| isPending\}/);
  assert.match(source, /aria-busy=\{isPending\}/);
  assert.match(source, /animate-spin/);
});

test("external form submit feedback releases on server rerender and browser lifecycle recovery", () => {
  require("./helpers/assert-form-pending-recovery.cjs")();
  const source = read("src/components/ui/submit-button.tsx");
  assert.match(source, /listenForFormPendingRecovery\(document, window/);
  assert.match(source, /stopRecovery\(\)/);
  assert.match(source, /if \(pending\) document.dispatchEvent/);
  assert.match(source, /formId, pending: false/);
  assert.doesNotMatch(source, /setTimeout\(release, 30000\)/);
});
