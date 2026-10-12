import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "src", "app", "globals.css"), "utf8");
const filterBar = fs.readFileSync(path.join(root, "src", "components", "ui", "filter-bar.tsx"), "utf8");
const unified = fs.readFileSync(path.join(root, "src", "components", "common", "UnifiedListHeader.tsx"), "utf8");

test("filter dialog stays above content without removing mobile navigation", () => {
  assert.match(filterBar, /dataset\.filterDialogOpen\s*=\s*"true"/);
  assert.doesNotMatch(css, /html\[data-filter-dialog-open\]\s+\[data-mobile-app-nav\]\s*\{[\s\S]*display:\s*none\s*!important/);
  assert.match(css, /bottom: calc\(var\(--sb-mobile-nav-height\) \+ 1rem\)/);
});

test("mobile filter dialog traps keyboard focus and restores its trigger", () => {
  assert.match(unified, /filterTriggerRef/);
  assert.match(unified, /filterDialogRef/);
  assert.match(unified, /focusDialog\(dialog\)/);
  assert.match(unified, /event\.key === "Escape"/);
  assert.match(unified, /containDialogTab\(event, dialog\)/);
  assert.match(unified, /tabIndex=\{-1\}/);
  assert.match(unified, /requestAnimationFrame\(\(\) => trigger\?\.focus\(\)\)/);
  assert.match(unified, /aria-haspopup="dialog" aria-expanded=\{open\}/);
});
