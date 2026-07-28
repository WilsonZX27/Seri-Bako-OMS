const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("technical tables pin the first semantic identity by default and skip bulk-selection checkboxes", () => {
  const table = read("src/components/ui/table.tsx");
  const styles = read("src/app/globals.css");
  const design = read("DESIGN.md");

  assert.match(table, /stickyColumn = "first"/);
  assert.match(table, /stickyColumn\?: "none" \| "first" \| "second"/);
  assert.doesNotMatch(table, /"last"/);
  assert.match(table, /h-12 w-12[\s\S]*md:h-11 md:w-11[\s\S]*xl:h-8 xl:w-8/);
  assert.match(styles, /data-sticky-column="first"/);
  assert.match(styles, /data-sticky-column="second"/);
  assert.doesNotMatch(styles, /\.sb-table-region th:last-child,/);
  assert.match(design, /Technical tables pin their first semantic identity column by default/);
  for (const page of [
    "src/app/(app)/documents/page.tsx",
    "src/app/(app)/goods-receivings/page.tsx",
    "src/app/(app)/items/page.tsx",
    "src/app/(app)/purchase-requests/page.tsx",
    "src/app/(app)/purchase-orders/page.tsx",
    "src/app/(app)/production/jobs/page.tsx",
    "src/app/(app)/suppliers/page.tsx",
  ]) {
    assert.match(read(page), /stickyColumn="second"/, `${page}: semantic column follows bulk selection`);
  }
  assert.match(design, /status tab is itself the status filter/);
});
