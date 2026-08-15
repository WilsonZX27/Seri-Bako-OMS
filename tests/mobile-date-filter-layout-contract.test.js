import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync("src/components/common/UnifiedListHeader.tsx", "utf8");
const design = readFileSync("src/app/design-system-v2.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");

test("phone date filters render an explicit readable value above the native picker", () => {
  assert.match(header, /const visibleDate = value/);
  assert.match(header, /unified-list-date-placeholder[^>]*aria-hidden="true">\{visibleDate\}/);
  assert.match(design, /\.unified-list-date-control input\[type="date"\][\s\S]*?position: absolute;[\s\S]*?opacity: 0;/);
  assert.match(design, /\.unified-list-date-control:focus-within/);
});

test("phone result count stays beside the date and filter controls", () => {
  assert.match(design, /grid-template-columns: minmax\(0, 1fr\) 104px auto;/);
  assert.match(design, /\.unified-list-result \{[\s\S]*?grid-column: 3;/);
  assert.match(globals, /form\.sb-list-filters\.sb-list-filters--date-first > :first-child/);
  assert.doesNotMatch(globals, /(?<!\.sb-list-filters)\.sb-list-filters--date-first > :first-child/);
});
