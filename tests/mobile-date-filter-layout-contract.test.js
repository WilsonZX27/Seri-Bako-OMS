import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync("src/components/common/UnifiedListHeader.tsx", "utf8");
const design = readFileSync("src/app/design-system-v2.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");
const outletPage = readFileSync("src/app/(app)/outlet-daily-records/page.tsx", "utf8");
const matrix = readFileSync("src/components/outlet-daily-completion-matrix.tsx", "utf8");

test("phone date filters render an explicit readable value above the native picker", () => {
  assert.match(header, /const visibleDate = value/);
  assert.match(header, /unified-list-date-placeholder[^>]*aria-hidden="true">\{visibleDate\}/);
  assert.match(design, /\.unified-list-date-control input\[type="date"\][\s\S]*?position: absolute;[\s\S]*?opacity: 0;/);
  assert.match(design, /\.unified-list-date-control:focus-within/);
});

test("outlet daily matrix scroll stays inside its own viewport and cannot collapse the date row", () => {
  assert.match(outletPage, /data-outlet-daily-list-workspace/);
  assert.match(outletPage, /data-outlet-daily-primary/);
  assert.match(outletPage, /data-outlet-daily-insights/);
  assert.match(outletPage, /data-outlet-daily-record-list/);
  assert.match(outletPage, /overflow-x-clip/);
  assert.match(matrix, /data-outlet-completion-matrix/);
  assert.match(matrix, /isolate min-w-0 max-w-full overflow-hidden/);
  assert.match(matrix, /data-outlet-completion-scrollport/);
  assert.match(design, /form\.unified-list-header\.sb-list-filters--date-first[\s\S]*?width: 100% !important;[\s\S]*?max-width: 100% !important;/);
  assert.match(design, /\[data-outlet-daily-list-workspace\] > \[data-outlet-daily-primary\][\s\S]*?order: 1;/);
  assert.match(design, /\[data-outlet-daily-list-workspace\] > \[data-outlet-daily-insights\][\s\S]*?order: 2;/);
});

test("phone result count stays beside the date and filter controls", () => {
  assert.match(design, /grid-template-columns: minmax\(0, 1fr\) 104px auto;/);
  assert.match(design, /\.unified-list-result \{[\s\S]*?grid-column: 3;/);
  assert.match(globals, /form\.sb-list-filters\.sb-list-filters--date-first:not\(\.sb-list-query-card\) > :first-child/);
  assert.doesNotMatch(globals, /form\.sb-list-filters\.sb-list-filters--date-first > :first-child/);
});
