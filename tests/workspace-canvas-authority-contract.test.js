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
    assert.match(workspace, /data-tablet-content=\{rightRail && effectiveTabletCanvas !== "full" \? "contained" : undefined\}/);
    assert.match(workspace, /tabletCanvas \?\? \(documentMode \? "contained" : "wide"\)/);
  });

  test("desktop workspace width is not capped by a global canvas override", () => {
    assert.doesNotMatch(css, /--sb-canvas-contained/);
    assert.doesNotMatch(css, /--sb-canvas-wide/);
    assert.doesNotMatch(css, /\[data-workspace-grid\]/);
  });

  test("tablet rail width has one CSS authority instead of competing runtime grid utilities", () => {
    assert.match(workspace, /data-tablet-rail-width=\{tabletRailWidth\}/);
    assert.doesNotMatch(workspace, /grid-cols-\[|splitGridClass|splitRailClass/);
    assert.match(css, /data-tablet-rail-width="half"[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(18rem, 42%\)/);
    assert.match(css, /data-tablet-rail-breakpoint="md"\]\[data-tablet-rail-width="compact"\][\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(14rem, 18rem\)/);
  });

  test("coarse-pointer CSS does not compete with the runtime tablet shell", () => {
    assert.doesNotMatch(css, /\(max-width: 1366px\) and \(hover: none\) and \(pointer: coarse\)/);
  });

  test("tablet query controls stay bounded while the grid preserves breathing room", () => {
    assert.match(listHeader, /--sb-list-tablet-columns/);
    assert.match(listHeader, /desktopControls\.length \+ \(desktopActions\.length \? 2 : 0\)/);
    assert.match(listHeader, /data-tablet-query-layout=\{tabletLayout\}/);
    assert.match(css, /repeat\(var\(--sb-list-tablet-columns, 4\), minmax\(0, 1fr\)\)/);
    assert.match(css, /data-tablet-query-layout="controls"/);
    assert.match(css, /\.sb-list-query-card:is\(\[data-tablet-query-layout="query"\], \[data-tablet-query-layout="controls"\]\) > :where\(select[\s\S]*?width: 9rem !important;/);
    assert.match(css, /unified-list-desktop-actions[\s\S]*display: flex !important/);
    assert.match(css, /unified-list-desktop-actions > \.unified-list-action[\s\S]*width: 7\.5rem !important/);
    assert.match(css, /\[data-tablet-content="contained"\][\s\S]*width: min\(calc\(100% - 3rem\), 64rem\)/);
    assert.match(css, /form\.sb-list-query-card > \.unified-list-desktop-actions[\s\S]*min-width: max-content[\s\S]*white-space: nowrap/);
    assert.doesNotMatch(css, /repeat\(4, minmax\(8rem, 1fr\)\)/);
  });
});
