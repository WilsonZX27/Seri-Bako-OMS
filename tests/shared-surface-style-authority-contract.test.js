const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const designV2 = fs.readFileSync("src/app/design-system-v2.css", "utf8");
const globals = fs.readFileSync("src/app/globals.css", "utf8");

test("shared work surfaces have one scoped visual owner", () => {
  const owner = /html\[data-design-layer="v2"\] :where\(\.erp-surface, \.sb-work-surface, \.border\.bg-card\)\s*\{([\s\S]*?)\}/g;
  const matches = [...designV2.matchAll(owner)];

  assert.equal(matches.length, 1);
  assert.match(matches[0][1], /border:\s*1px solid var\(--sb-border-soft\)/);
  assert.match(matches[0][1], /background:\s*var\(--sb-surface-raised\)/);
  assert.doesNotMatch(designV2, /^\.sb-work-surface\s*,?\s*$/m);
});

test("legacy list filters keep structure in globals while v2 owns their surface", () => {
  const legacyFilter = globals.match(/\.sb-list-filters:not\(\.sb-list-query-card\)\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const legacyPanel = globals.match(/\.sb-filter-more > \.sb-filter-more-panel\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const canonical = designV2.match(/html\[data-design-layer="v2"\] :where\(\.sb-list-filters[\s\S]*?\.sb-pr-basket-sheet\)\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.doesNotMatch(legacyFilter, /(?:border|background|box-shadow)\s*:/);
  assert.doesNotMatch(legacyPanel, /(?:border|background|box-shadow)\s*:/);
  assert.match(canonical, /border:\s*1px solid var\(--sb-border-soft\)/);
  assert.match(canonical, /background:\s*var\(--sb-surface-raised\)/);
  assert.match(canonical, /box-shadow:\s*var\(--sb-shadow-sm\)/);
  assert.doesNotMatch(canonical, /!important/);
});
