const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const designV2 = fs.readFileSync("src/app/design-system-v2.css", "utf8");

test("shared work surfaces have one scoped visual owner", () => {
  const owner = /html\[data-design-layer="v2"\] :where\(\.erp-surface, \.sb-work-surface, \.border\.bg-card\)\s*\{([\s\S]*?)\}/g;
  const matches = [...designV2.matchAll(owner)];

  assert.equal(matches.length, 1);
  assert.match(matches[0][1], /border:\s*1px solid var\(--sb-border-soft\)/);
  assert.match(matches[0][1], /background:\s*var\(--sb-surface-raised\)/);
  assert.doesNotMatch(designV2, /^\.sb-work-surface\s*,?\s*$/m);
});

test("command surface has one scoped visual owner without cascade overrides", () => {
  const owner = /html\[data-design-layer="v2"\] \.sb-command-surface\s*\{([\s\S]*?)\}/g;
  const matches = [...designV2.matchAll(owner)];

  assert.equal(matches.length, 1);
  assert.match(matches[0][1], /background:\s*var\(--sb-green-900\)/);
  assert.match(matches[0][1], /color:\s*var\(--sb-surface-raised\)/);
  assert.doesNotMatch(matches[0][1], /!important/);
  assert.doesNotMatch(designV2, /body \.sb-command-surface/);
  assert.doesNotMatch(designV2, /^\.sb-command-surface\s*\{/m);
});
