const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const globals = fs.readFileSync("src/app/globals.css", "utf8");
const designV2 = fs.readFileSync("src/app/design-system-v2.css", "utf8");
const filterBar = fs.readFileSync("src/components/ui/filter-bar.tsx", "utf8");
const selectControl = fs.readFileSync("src/components/ui/select-control.tsx", "utf8");

test("FilterBar geometry has one authoritative stylesheet", () => {
  assert.doesNotMatch(designV2, /^\s*\.sb-list-filters\s*\{/m);
  assert.match(globals, /\.sb-list-filters\s*\{/);
  assert.doesNotMatch(globals, /\[data-tablet-main-list\] \.sb-list-filters\s*\{[\s\S]*?display:\s*grid/);
  assert.doesNotMatch(`${globals}\n${designV2}`, /\.sb-tablet-split-filter/);
  assert.match(designV2, /One tablet grammar for every list/);
  assert.match(designV2, /full-width query on row one/);
  assert.doesNotMatch(globals, /\[data-tablet-split-actions\] > section,\s*\[data-tablet-main-list\]/);
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
