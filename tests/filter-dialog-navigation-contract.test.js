import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "src", "app", "globals.css"), "utf8");
const filterBar = fs.readFileSync(path.join(root, "src", "components", "ui", "filter-bar.tsx"), "utf8");
const unified = fs.readFileSync(path.join(root, "src", "components", "common", "UnifiedListHeader.tsx"), "utf8");

test("filter dialog owns the mobile navigation surface while open", () => {
  assert.match(filterBar, /dataset\.filterDialogOpen\s*=\s*"true"/);
  assert.match(css, /html\[data-filter-dialog-open\]\s+\[data-mobile-app-nav\]\s*\{[\s\S]*display:\s*none\s*!important/);
});

test("mobile filter dialog traps keyboard focus and restores its trigger", () => {
  assert.match(unified, /filterTriggerRef/);
  assert.match(unified, /filterDialogRef/);
  assert.match(unified, /querySelectorAll<HTMLElement>\("button, a, input, select, textarea/);
  assert.match(unified, /event\.key === "Escape"/);
  assert.match(unified, /event\.shiftKey && document\.activeElement === first/);
  assert.match(unified, /document\.activeElement === last/);
  assert.match(unified, /requestAnimationFrame\(\(\) => trigger\?\.focus\(\)\)/);
  assert.match(unified, /aria-haspopup="dialog" aria-expanded=\{open\}/);
});
