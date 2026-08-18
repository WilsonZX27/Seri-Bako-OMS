const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const globals = fs.readFileSync("src/app/globals.css", "utf8");
const designV2 = fs.readFileSync("src/app/design-system-v2.css", "utf8");
const filterBar = fs.readFileSync("src/components/ui/filter-bar.tsx", "utf8");
const selectControl = fs.readFileSync("src/components/ui/select-control.tsx", "utf8");
const input = fs.readFileSync("src/components/ui/input.tsx", "utf8");
const unifiedListHeader = fs.readFileSync("src/components/common/UnifiedListHeader.tsx", "utf8");

test("FilterBar geometry has one authoritative stylesheet", () => {
  assert.doesNotMatch(designV2, /^\s*\.sb-list-filters\s*\{/m);
  assert.match(globals, /\.sb-list-filters:not\(\.sb-list-query-card\)\s*\{/);
  assert.doesNotMatch(globals, /(^|\n)\s*\.sb-list-filters\s*(?:>|\{)/);
  assert.doesNotMatch(globals, /\[data-tablet-main-list\] \.sb-list-filters\s*\{[\s\S]*?display:\s*grid/);
  assert.doesNotMatch(`${globals}\n${designV2}`, /\.sb-tablet-split-filter/);
  assert.match(designV2, /One tablet grammar for every list/);
  assert.match(designV2, /filter-dense forms without a query still use the same bounded grid/);
  assert.doesNotMatch(globals, /\[data-tablet-split-actions\] > section,\s*\[data-tablet-main-list\]/);
  const canonicalStart = designV2.indexOf("Canonical list workspace contract");
  assert.notEqual(canonicalStart, -1);
  const beforeCanonical = designV2.slice(0, canonicalStart);
  assert.doesNotMatch(
    beforeCanonical,
    /\.sb-list-filters:not\(\.unified-list-header\)(?!:not\(\.sb-list-query-card\))/,
    "legacy v2 filter compatibility rules must not also own query-card geometry",
  );
  assert.equal((designV2.match(/form\[data-unified-list-desktop="true"\]/g) ?? []).length, 1);
  assert.doesNotMatch(beforeCanonical, /Canonical desktop\/tablet filter rail|Compact desktop filter contract|flex:\s*0 0 9rem/);
  assert.equal((designV2.match(/Canonical list workspace contract/g) ?? []).length, 1);
  assert.equal((designV2.match(/:where\(\[class~="bg-card"\], \[class~="overflow-hidden"\]\):has\(> form\.sb-list-query-card\) \{/g) ?? []).length, 1);
  assert.equal((designV2.match(/form\.sb-list-query-card \{\s*\r?\n\s*margin: 0;/g) ?? []).length, 1);
  assert.match(designV2.slice(canonicalStart), /form\.sb-list-query-card[\s\S]*?white-space:\s*nowrap;[\s\S]*?text-overflow:\s*ellipsis;/);
  assert.match(designV2.slice(canonicalStart), /@media \(min-width: 1280px\)[\s\S]*?form\.sb-list-query-card \{[\s\S]*?flex-wrap:\s*nowrap !important;/);
  assert.match(designV2.slice(canonicalStart), /unified-list-date-control/);
  assert.match(input, /unified-list-date-control/);
  assert.match(unifiedListHeader, /data-tablet-query-layout=\{tabletLayout\}/);
  assert.match(unifiedListHeader, /desktopControls\.length > 2[\s\S]*?"controls"/);
  assert.match(unifiedListHeader, /desktopControls\.length \+ \(desktopActions\.length \? 2 : 0\)/);
  assert.match(designV2.slice(canonicalStart), /data-tablet-query-layout="controls"[\s\S]*?grid-column:\s*1 \/ -1/);
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

test("desktop list actions keep the established Search then record-count order", () => {
  const actionsStart = unifiedListHeader.indexOf('<div className="unified-list-desktop-actions">');
  assert.notEqual(actionsStart, -1);
  const actionsEnd = unifiedListHeader.indexOf("</div>", actionsStart);
  const actions = unifiedListHeader.slice(actionsStart, actionsEnd);
  assert.ok(actions.indexOf("{actionNodes}") < actions.indexOf('className="sb-filter-summary"'));
});

test("shared query controls keep compact text and bounded tablet measures", () => {
  const canonical = designV2.slice(designV2.indexOf("Canonical list workspace contract"));
  assert.match(canonical, /form\.sb-list-query-card :where\(input, select, button[\s\S]*?font-size: 0\.75rem !important;/);
  assert.match(canonical, /@media \(min-width: 640px\) and \(max-width: 1279px\)[\s\S]*?\.sb-list-query-card:is\(\[data-tablet-query-layout="query"\], \[data-tablet-query-layout="controls"\]\) > :where\(select[\s\S]*?width: 9rem !important;/);
  assert.match(canonical, /\.unified-list-desktop-actions > \.unified-list-action \{[\s\S]*?width: 7\.5rem !important;/);
  assert.match(canonical, /Tablet has enough room for a deliberate two-sided command row/);
  assert.match(canonical, /form\.sb-list-query-card\[data-tablet-query-layout="query"\] > \.unified-list-desktop-actions[\s\S]*?grid-column: -2 \/ -1[\s\S]*?justify-self: end/);
});
