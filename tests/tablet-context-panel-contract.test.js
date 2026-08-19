const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("tablet workspace context never overlaps the primary data canvas", () => {
  const source = fs.readFileSync("src/components/layout/workspace-layout.tsx", "utf8");
  const css = fs.readFileSync("src/app/design-system-v2.css", "utf8");
  assert.doesNotMatch(source, /data-tablet-context/);
  assert.doesNotMatch(source, /absolute right-0 z-\[var\(--sb-z-dropdown\)\]/);
  assert.match(source, /RightConsoleMount/);
  assert.match(source, /data-tablet-document-split/);
  assert.match(source, /data-tablet-rail-width=\{tabletRailWidth\}/);
  assert.match(css, /data-tablet-rail-breakpoint="md"[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(14rem, 24%\)/);
  assert.match(css, /data-tablet-rail-breakpoint="md"\]\[data-tablet-rail-width="compact"\][\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(14rem, 18rem\)/);
});

test("the items master keeps its actions and summary visible beside the tablet list", () => {
  const source = fs.readFileSync("src/app/(app)/items/page.tsx", "utf8");
  assert.match(source, /tabletRailMode="split"/);
  assert.match(source, /tabletRailBreakpoint="md"/);
  assert.match(source, /title="Actions"/);
  assert.match(source, /title="Item Summary"/);
});

test("the shared mobile actions sheet locks background scroll and keeps focus inside", () => {
  const source = fs.readFileSync("src/components/layout/right-console.tsx", "utf8");
  assert.match(source, /const previousOverflow = document\.body\.style\.overflow/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /event\.key !== "Tab"/);
});

test("stale route cleanups cannot clear a newer right-console mount", () => {
  const source = fs.readFileSync("src/components/layout/right-console.tsx", "utf8");
  assert.match(source, /activeOwnerRef = useRef<symbol \| null>\(null\)/);
  assert.match(source, /setContent: \(owner: symbol, nextContent/);
  assert.match(source, /if \(activeOwnerRef\.current !== owner\) return;/);
  assert.match(source, /const owner = Symbol\("right-console-mount"\)/);
  assert.match(source, /context\?\.clearContent\(owner\)/);
});
