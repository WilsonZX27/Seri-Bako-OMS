const fs = require("node:fs");
const path = require("node:path");
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "src/app/design-system-v2.css"), "utf8");
const workspace = fs.readFileSync(path.join(root, "src/components/layout/workspace-layout.tsx"), "utf8");

describe("workspace canvas authority", () => {
  test("WorkspaceGrid owns one explicit application canvas marker", () => {
    assert.match(workspace, /data-workspace-grid/);
    assert.match(workspace, /data-tablet-canvas=\{effectiveTabletCanvas\}/);
  });

  test("contained, wide, and full canvases are defined by the canonical layer", () => {
    assert.match(css, /\[data-workspace-grid\]\[data-tablet-canvas="contained"\]/);
    assert.match(css, /\[data-workspace-grid\]\[data-tablet-canvas="wide"\]/);
    assert.match(css, /\[data-workspace-grid\]\[data-tablet-canvas="full"\]/);
    assert.match(workspace, /const effectiveTabletCanvas = tabletCanvas \?\? "contained"/);
    assert.match(css, /--sb-canvas-contained:\s*64rem/);
    assert.match(css, /--sb-canvas-wide:\s*76rem/);
  });

  test("touch tablets have a no-JS shell fallback", () => {
    assert.match(css, /\(max-width: 1366px\) and \(hover: none\) and \(pointer: coarse\)/);
    assert.match(css, /@media[^\{]+pointer: coarse[\s\S]*?aside\[data-app-sidebar\][\s\S]*?display:\s*none\s*!important/);
    assert.match(css, /@media[^\{]+pointer: coarse[\s\S]*?\[data-mobile-app-nav\][\s\S]*?display:\s*block\s*!important/);
  });
});
