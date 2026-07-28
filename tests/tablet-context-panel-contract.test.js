const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("tablet workspace context never overlaps the primary data canvas", () => {
  const source = fs.readFileSync("src/components/layout/workspace-layout.tsx", "utf8");
  assert.doesNotMatch(source, /data-tablet-context/);
  assert.doesNotMatch(source, /absolute right-0 z-\[var\(--sb-z-dropdown\)\]/);
  assert.match(source, /RightConsoleMount/);
  assert.match(source, /data-tablet-document-split/);
  assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_18rem\]/);
});

test("the shared mobile actions sheet locks background scroll and keeps focus inside", () => {
  const source = fs.readFileSync("src/components/layout/right-console.tsx", "utf8");
  assert.match(source, /const previousOverflow = document\.body\.style\.overflow/);
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(source, /role="dialog" aria-modal="true"/);
  assert.match(source, /event\.key !== "Tab"/);
});
