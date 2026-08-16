const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const globals = fs.readFileSync("src/app/globals.css", "utf8");
const designV2 = fs.readFileSync("src/app/design-system-v2.css", "utf8");
const filterBar = fs.readFileSync("src/components/ui/filter-bar.tsx", "utf8");
const selectControl = fs.readFileSync("src/components/ui/select-control.tsx", "utf8");
const input = fs.readFileSync("src/components/ui/input.tsx", "utf8");

test("FilterBar geometry has one authoritative stylesheet", () => {
  assert.doesNotMatch(designV2, /^\s*\.sb-list-filters\s*\{/m);
  assert.match(globals, /\.sb-list-filters:not\(\.sb-list-query-card\)\s*\{/);
  assert.doesNotMatch(globals, /(^|\n)\s*\.sb-list-filters\s*(?:>|\{)/);
  assert.doesNotMatch(globals, /\[data-tablet-main-list\] \.sb-list-filters\s*\{[\s\S]*?display:\s*grid/);
  assert.doesNotMatch(`${globals}\n${designV2}`, /\.sb-tablet-split-filter/);
  assert.match(designV2, /One tablet grammar for every list/);
  assert.match(designV2, /full-width query on row one/);
  assert.doesNotMatch(globals, /\[data-tablet-split-actions\] > section,\s*\[data-tablet-main-list\]/);
  const canonicalStart = designV2.indexOf("Canonical list workspace contract");
  assert.notEqual(canonicalStart, -1);
  const beforeCanonical = designV2.slice(0, canonicalStart);
  assert.equal((designV2.match(/form\[data-unified-list-desktop="true"\]/g) ?? []).length, 1);
  assert.doesNotMatch(beforeCanonical, /Canonical desktop\/tablet filter rail|Compact desktop filter contract|flex:\s*0 0 9rem/);
  assert.equal((designV2.match(/Canonical list workspace contract/g) ?? []).length, 1);
  assert.equal((designV2.match(/:where\(\[class~="bg-card"\], \[class~="overflow-hidden"\]\):has\(> form\.sb-list-query-card\) \{/g) ?? []).length, 1);
  assert.equal((designV2.match(/form\.sb-list-query-card \{\s*\r?\n\s*margin: 0;/g) ?? []).length, 1);
  assert.match(designV2.slice(canonicalStart), /form\.sb-list-query-card[\s\S]*?white-space:\s*nowrap;[\s\S]*?text-overflow:\s*ellipsis;/);
  assert.match(designV2.slice(canonicalStart), /@media \(min-width: 1280px\)[\s\S]*?form\.sb-list-query-card \{[\s\S]*?flex-wrap:\s*nowrap !important;/);
  assert.match(designV2.slice(canonicalStart), /unified-list-date-control/);
  assert.match(input, /unified-list-date-control/);
});

test("hidden persisted filters do not steal the leading query slot", () => {
  assert.match(globals, /input\[type="hidden"\]:first-child \+ \*/);
  assert.match(globals, /@media \(max-width: 767px\)[\s\S]*?input\[type="hidden"\]:first-child \+ \*[\s\S]*?flex:\s*1 1 100%/);
});

test("desktop filter overlays are mutually exclusive", () => {
  assert.match(filterBar, /sb:close-filter-more/g);
  assert.match(filterBar, /sb:close-select-controls/g);
  assert.match(selectControl, /sb:close-filter-more/g);
  assert.match(selectControl, /sb:close-select-controls/g);
  assert.match(filterBar, /close\(false\)/);
  assert.match(selectControl, /setOpen\(false\)/);
});
