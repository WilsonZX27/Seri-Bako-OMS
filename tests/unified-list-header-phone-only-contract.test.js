import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const component = fs.readFileSync(
  path.join(root, "src", "components", "common", "UnifiedListHeader.tsx"),
  "utf8",
);
const styles = fs.readFileSync(
  path.join(root, "src", "app", "design-system-v2.css"),
  "utf8",
);

test("unified list header is phone-only and preserves desktop controls", () => {
  assert.match(component, /matchMedia\("\(max-width: 639px\)"\)/);
  assert.match(component, /data-unified-list-desktop="true"/);
  assert.match(component, /if \(!mobile\)[\s\S]*data-unified-list-desktop/);
  assert.match(styles, /@media \(max-width: 639px\)[\s\S]*\.unified-list-header/);
  assert.match(styles, /form\[data-unified-list-desktop="true"\]\s*\{\s*display:\s*none/);
});

test("unified filter sheet covers the complete phone viewport and nav", () => {
  assert.match(styles, /\.unified-list-backdrop\s*\{[\s\S]*inset:\s*0;[\s\S]*z-index:\s*100/);
  assert.match(styles, /\.unified-list-sheet\s*\{[\s\S]*bottom:\s*0;[\s\S]*z-index:\s*101/);
  assert.match(styles, /body:has\(\[data-mobile-action-bar\]\)\s+\[data-mobile-app-nav\]/);
});
