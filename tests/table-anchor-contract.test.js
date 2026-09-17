const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("technical tables use the shared pinned lead band without overlap", () => {
  const table = read("src/components/ui/table.tsx");
  const styles = read("src/app/globals.css");
  const design = read("DESIGN.md");

  assert.match(table, /stickyColumn = "first"/);
  assert.match(table, /stickyColumn\?: "none" \| "first" \| "second" \| "third"/);
  assert.match(table, /compactUntil\?: "md" \| "xl" \| "2xl"/);
  assert.match(table, /showUntil\?: "md" \| "xl" \| "2xl"/);
  assert.match(table, /compactUntil === "2xl" \? "hidden 2xl:block"/);
  assert.match(table, /showUntil === "2xl" \? "2xl:hidden"/);
  assert.doesNotMatch(table, /"last"/);
  assert.match(table, /mx-auto[\s\S]*h-11 w-11[\s\S]*shrink-0[\s\S]*justify-center[\s\S]*xl:h-8 xl:w-8/);
  assert.match(styles, /data-sticky-column="first"/);
  assert.match(styles, /data-sticky-column="second"/);
  assert.match(styles, /data-sticky-column="third"/);
  assert.match(styles, /width: 2\.5rem;/);
  assert.match(styles, /left: 5rem;/);
  assert.doesNotMatch(table, /data-scrolled|data-overflow-state|ResizeObserver/);
  assert.doesNotMatch(styles, /data-scrolled="true"|18px 0 24px -10px/);
  assert.match(styles, /Sticky identity columns use a literal divider/);
  assert.match(styles, /box-shadow: 1px 0 var\(--sb-border\);/);
  assert.match(table, /\[&>svg\]:!h-3\.5/);
  assert.doesNotMatch(table, /isActionLabel/);
  assert.doesNotMatch(styles, /\.sb-table-region th:last-child,/);
  assert.match(design, /Technical tables pin their first semantic identity column by default/);
  for (const page of [
    "src/app/(app)/documents/page.tsx",
    "src/app/(app)/goods-receivings/page.tsx",
    "src/app/(app)/items/page.tsx",
    "src/app/(app)/production/jobs/page.tsx",
    "src/app/(app)/purchase-orders/page.tsx",
    "src/app/(app)/people/page.tsx",
    "src/app/(app)/stock-transactions/page.tsx",
    "src/app/(app)/stock-wastage/page.tsx",
    "src/app/(app)/supplier-items/page.tsx",
    "src/app/(app)/suppliers/page.tsx",
    "src/app/(app)/uom-conversions/page.tsx",
  ]) {
    assert.match(read(page), /stickyColumn="second"/, `${page}: action and identity remain pinned`);
  }
  assert.match(
    read("src/app/(app)/outlet-daily-records/page.tsx"),
    /stickyColumn="second"/,
    "outlet daily records: action and readable date remain fixed while location and metrics scroll",
  );
  assert.match(
    read("src/app/(app)/purchase-requests/page.tsx"),
    /stickyColumn="third"/,
    "purchase requests: checkbox, action, and request identity share one seamless pinned lead band",
  );
  assert.match(design, /The shared Action column is a compact 2\.5rem icon track/);
});

test("mobile operational rows require a deliberate double tap while keyboard access stays available", () => {
  const table = read("src/components/ui/table.tsx");
  assert.match(table, /data-open-gesture="double-tap"/);
  assert.match(table, /event\.preventDefault\(\)/);
  assert.match(table, /<Link href=\{href\}/);
});
