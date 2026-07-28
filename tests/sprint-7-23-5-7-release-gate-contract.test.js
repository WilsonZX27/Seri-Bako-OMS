const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("shared overlays and menus use the canonical release surfaces", () => {
  const css = read("src/app/globals.css");
  const modal = read("src/components/ui/modal-shell.tsx");
  const account = read("src/components/layout/account-menu.tsx");
  const actionDropdown = read("src/components/layout/quick-access-menu.tsx");

  assert.match(css, /\.sb-popover-surface/);
  assert.match(css, /\.sb-dialog-backdrop/);
  assert.match(modal, /document\.body\.style\.overflow = "hidden"/);
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /role="dialog"/);
  for (const source of [account, actionDropdown]) {
    assert.match(source, /sb-popover-surface/);
    assert.match(source, /event\.key === "Escape"/);
    assert.match(source, /\.focus\(\)/);
  }
  assert.match(actionDropdown, /document\.body\.style\.overflow = "hidden"/);
  assert.match(actionDropdown, /aria-modal="true"/);
  assert.match(actionDropdown, /event\.key !== "Tab"/);
  assert.match(actionDropdown, /fixed right-3 top-\[calc\(var\(--sb-topbar-height\)\+0\.5rem\)\]/);
});

test("annotated actions and compact tables are implemented through shared structures", () => {
  const dashboard = read("src/components/dashboard-workspace.tsx");
  const documentWorkspace = read("src/components/documents/document-workspace.tsx");
  const mobileDocumentSurfaces = read("src/components/documents/mobile-document-surfaces.tsx");
  const table = read("src/components/ui/table.tsx");

  assert.doesNotMatch(dashboard, /Protected controls/);
  assert.match(dashboard, /<ConsoleSection title="Actions">/);
  assert.match(documentWorkspace, /function DocumentActionSection/);
  assert.match(documentWorkspace, /<DocumentMoreOptions/);
  assert.match(mobileDocumentSurfaces, /disabled=\{!hydrated\}/);
  assert.match(table, /function TableSelectionHead/);
  assert.match(table, /w-10 min-w-10 max-w-10/);
});

test("the sanitized release package is complete", () => {
  for (const file of [
    "docs/qa/SPRINT_7_23_5_7_E2E_MATRIX.md",
    "docs/qa/SPRINT_7_23_5_7_KNOWN_LIMITATIONS.md",
    "docs/qa/SPRINT_7_23_5_7_PRODUCTION_DEPLOYMENT_CHECKLIST.md",
    "docs/qa/SPRINT_7_23_5_7_MIGRATION_LEDGER_071_075.md",
    "docs/qa/SPRINT_7_23_5_7_JACK_ASHLEY_FINANCE_CHECKLIST.md",
    "docs/qa/SPRINT_7_23_5_7_UX_AUDIT.md",
  ]) {
    assert.equal(fs.existsSync(file), true, `${file} should exist`);
  }
  assert.match(read("src/lib/app-version.ts"), /APP_SPRINT = `v\$\{APP_VERSION\}`/);
});
