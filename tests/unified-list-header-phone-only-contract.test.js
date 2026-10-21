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

test("search rows share one responsive component while non-search controls preserve their layout", () => {
  assert.match(component, /matchMedia\("\(max-width: 1279px\)"\)/);
  assert.match(component, /data-unified-list-desktop="true"/);
  assert.match(component, /const renderBoth = stableResponsive && !phoneOnly/);
  assert.match(component, /const desktopForm = !sharedSearchRow && \(!mobile \|\| renderBoth\)/);
  assert.match(component, /data-shared-search-row=\{sharedSearchRow \|\| undefined\}/);
  assert.match(component, /return renderBoth \? <>\{desktopForm\}\{mobileForm\}<\/> : mobileForm/);
  assert.match(styles, /form\.sb-list-query-card\.sb-stable-desktop-form \{ display: none !important; \}/);
  assert.match(styles, /form\.sb-list-query-card\.unified-list-header\.sb-stable-mobile-form \{ display: none !important; \}/);
  assert.match(styles, /@media \(max-width: 639px\)[\s\S]*\.unified-list-header/);
  assert.match(styles, /form\[data-unified-list-desktop="true"\]\s*\{\s*display:\s*none/);
});

test("shared search filters center within the viewport and retain keyboard access", () => {
  const sharedStyles = fs.readFileSync(path.join(root, "src/components/common/UnifiedListHeader.module.css"), "utf8");
  assert.match(sharedStyles, /\.backdrop \{[^}]*inset: 0/);
  assert.match(sharedStyles, /\.sheet \{[^}]*inset: 50% auto auto 50%[^}]*translate\(-50%, -50%\)/);
  assert.match(component, /containDialogTab\(event, dialog\)/);
  assert.match(component, /if \(event.key === "Escape"\)/);
  assert.match(component, /requestAnimationFrame\(\(\) => trigger\?\.focus\(\)\)/);
});
