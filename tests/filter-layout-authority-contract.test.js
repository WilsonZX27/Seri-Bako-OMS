const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const globals = fs.readFileSync("src/app/globals.css", "utf8");
const designV2 = fs.readFileSync("src/app/design-system-v2.css", "utf8");

test("FilterBar geometry has one authoritative stylesheet", () => {
  assert.doesNotMatch(designV2, /^\s*\.sb-list-filters\s*\{/m);
  assert.match(globals, /\.sb-list-filters\s*\{/);
  assert.doesNotMatch(globals, /\[data-tablet-main-list\] \.sb-list-filters\s*\{[\s\S]*?display:\s*grid/);
});

test("hidden persisted filters do not steal the leading query slot", () => {
  assert.match(globals, /input\[type="hidden"\]:first-child \+ \*/);
  assert.match(globals, /@media \(max-width: 767px\)[\s\S]*?input\[type="hidden"\]:first-child \+ \*[\s\S]*?flex:\s*1 1 100%/);
});
