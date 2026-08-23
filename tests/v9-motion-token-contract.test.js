import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const designSystem = fs.readFileSync("src/app/design-system-v2.css", "utf8");

test("v9 table motion uses the shared token and preserves reduced-motion behavior", () => {
  assert.match(designSystem, /tbody tr\s*\{\s*transition:\s*background-color var\(--sb-motion-fast\) ease,\s*box-shadow var\(--sb-motion-fast\) ease;/);
  assert.match(designSystem, /@media \(prefers-reduced-motion: reduce\)/);
});
