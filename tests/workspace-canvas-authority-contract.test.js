const fs = require("node:fs");
const path = require("node:path");
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "src/app/design-system-v2.css"), "utf8");
const workspace = fs.readFileSync(path.join(root, "src/components/layout/workspace-layout.tsx"), "utf8");
const listHeader = fs.readFileSync(path.join(root, "src/components/common/UnifiedListHeader.tsx"), "utf8");

describe("workspace canvas regression", () => {
  test("WorkspaceGrid preserves the established document and list width intents", () => {
    assert.doesNotMatch(workspace, /data-workspace-grid/);
    assert.match(workspace, /data-tablet-canvas=\{effectiveTabletCanvas\}/);
    assert.match(workspace, /tabletCanvas \?\? \(documentMode \? "contained" : "wide"\)/);
  });

  test("desktop workspace width is not capped by a global canvas override", () => {
    assert.doesNotMatch(css, /--sb-canvas-contained/);
    assert.doesNotMatch(css, /--sb-canvas-wide/);
    assert.doesNotMatch(css, /\[data-workspace-grid\]/);
  });

  test("coarse-pointer CSS does not compete with the runtime tablet shell", () => {
    assert.doesNotMatch(css, /\(max-width: 1366px\) and \(hover: none\) and \(pointer: coarse\)/);
  });

  test("tablet query tracks follow their actual controls instead of reserving empty columns", () => {
    assert.match(listHeader, /--sb-list-tablet-columns/);
    assert.match(listHeader, /Math\.min\(Math\.max\(desktopControls\.length, 1\), 4\)/);
    assert.match(css, /repeat\(var\(--sb-list-tablet-columns, 4\), minmax\(0, 1fr\)\)/);
    assert.match(css, /width: 100% !important;[\s\S]*min-width: 0 !important;[\s\S]*max-width: none !important;/);
    assert.doesNotMatch(css, /repeat\(4, minmax\(8rem, 1fr\)\)/);
  });
});
