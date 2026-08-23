import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const designSystem = fs.readFileSync("src/app/design-system-v2.css", "utf8");

test("v9 table motion uses the shared token and preserves reduced-motion behavior", () => {
  assert.match(designSystem, /tbody tr\s*\{\s*transition:\s*background-color var\(--sb-motion-fast\) ease,\s*box-shadow var\(--sb-motion-fast\) ease;/);
  assert.match(designSystem, /\[data-mobile-bottom-nav\] :where\(a, button\)[\s\S]*transition: background-color var\(--sb-motion-fast\) ease/);
  assert.match(designSystem, /@media \(prefers-reduced-motion: reduce\)/);
});

test("v9 dashboard identity and panel headings use shared type tokens", () => {
  const globals = fs.readFileSync("src/app/globals.css", "utf8");
  assert.match(globals, /--sb-text-identity:\s*clamp\(/);
  assert.match(designSystem, /\[data-dashboard-user-name\][\s\S]*font-size: var\(--sb-text-identity\)/);
  assert.match(designSystem, /\[data-dashboard-panel\] > :first-child[\s\S]*font-size: var\(--sb-text-section\)/);
});
