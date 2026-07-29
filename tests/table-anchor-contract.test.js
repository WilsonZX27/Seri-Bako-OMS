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
  assert.doesNotMatch(table, /"last"/);
  assert.match(table, /h-12 w-full[\s\S]*justify-start pl-3[\s\S]*md:h-11[\s\S]*xl:h-8/);
  assert.match(styles, /data-sticky-column="first"/);
  assert.match(styles, /data-sticky-column="second"/);
  assert.match(styles, /data-sticky-column="third"/);
  assert.match(styles, /width: 4rem;/);
  assert.match(styles, /left: 6\.5rem;/);
  assert.match(table, /data-scrolled=\{scrolled \? "true" : "false"\}/);
  assert.match(styles, /data-scrolled="true"/);
  assert.match(styles, /14px 0 18px -8px/);
  assert.match(styles, /Internal lead-band cells stay seamless/);
  assert.match(table, /\[&>svg\]:!h-3\.5/);
  assert.doesNotMatch(table, /isActionLabel/);
  assert.doesNotMatch(styles, /\.sb-table-region th:last-child,/);
  assert.match(design, /Technical tables pin their first semantic identity column by default/);
  for (const page of [
    "src/app/(app)/outlet-daily-records/page.tsx",
    "src/app/(app)/stock-transactions/page.tsx",
    "src/app/(app)/stock-wastage/page.tsx",
    "src/app/(app)/supplier-items/page.tsx",
    "src/app/(app)/uom-conversions/page.tsx",
  ]) {
    assert.match(read(page), /stickyColumn="second"/, `${page}: action and identity remain pinned`);
  }
  for (const page of [
    "src/app/(app)/documents/page.tsx",
    "src/app/(app)/goods-receivings/page.tsx",
    "src/app/(app)/items/page.tsx",
    "src/app/(app)/production/jobs/page.tsx",
    "src/app/(app)/purchase-requests/page.tsx",
    "src/app/(app)/purchase-orders/page.tsx",
    "src/app/(app)/staffs/page.tsx",
    "src/app/(app)/suppliers/page.tsx",
  ]) {
    assert.match(read(page), /stickyColumn="third"/, `${page}: checkbox, action, and identity remain pinned`);
  }
  assert.match(design, /The shared Action column is 4rem wide/);
});
