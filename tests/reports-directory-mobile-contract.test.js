import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/(app)/reports/page.tsx", "utf8");

test("Reports directory uses complete touch-friendly named rows", () => {
  assert.match(page, /<Link key=\{report\.title\} href=\{report\.href\}/);
  assert.match(page, /aria-label=\{`Open \$\{report\.title\}: \$\{report\.description\}`\}/);
  assert.match(page, /min-h-14/);
  assert.match(page, /<ChevronRight/);
  assert.doesNotMatch(page, /<p className="truncate[^>]*>\{report\.title\}/);
  assert.doesNotMatch(page, /<p className="truncate[^>]*>\{report\.description\}/);
  assert.doesNotMatch(page, /<a href=\{report\.href\}>Open<\/a>/);
  assert.match(page, /rounded-\[var\(--sb-panel-radius\)\]/);
  assert.match(page, /rounded-\[var\(--sb-radius-control\)\]/);
  assert.doesNotMatch(page, /rounded-\[2px\]/);
});
