const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("pagination uses real disabled controls at its boundaries and retains direct page choices", () => {
  const source = fs.readFileSync("src/components/sortable-table.tsx", "utf8");

  assert.match(source, /pageNumbers/);
  assert.match(source, /page <= 1 \? \(/);
  assert.match(source, /type="button"[\s\S]*disabled>[\s\S]*Previous/);
  assert.match(source, /page >= totalPages \? \(/);
  assert.match(source, /type="button"[\s\S]*disabled>[\s\S]*Next/);
  assert.doesNotMatch(source, /aria-disabled=\{page <= 1\}/);
  assert.doesNotMatch(source, /aria-disabled=\{page >= totalPages\}/);
  assert.match(source, /h-\[var\(--sb-control-height\)\]/);
  assert.match(source, /min-w-\[var\(--sb-control-height\)\]/);
});

test("Outlet Daily pagination restores the page origin after changing pages", () => {
  const source = fs.readFileSync("src/components/sortable-table.tsx", "utf8");
  const reset = fs.readFileSync("src/components/pagination-scroll-reset.tsx", "utf8");
  const outlet = fs.readFileSync("src/app/(app)/outlet-daily-records/page.tsx", "utf8");

  assert.match(source, /resetScrollOnPageChange/);
  assert.match(reset, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(outlet, /resetScrollOnPageChange/);
});
