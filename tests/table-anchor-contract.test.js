const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("technical tables pin only an explicitly chosen semantic identity column", () => {
  const table = read("src/components/ui/table.tsx");
  const styles = read("src/app/globals.css");
  const design = read("DESIGN.md");

  assert.match(table, /stickyColumn = "none"/);
  assert.match(table, /stickyColumn\?: "none" \| "first" \| "last"/);
  assert.match(styles, /data-sticky-column="first"/);
  assert.doesNotMatch(styles, /\.sb-table-region th:last-child,/);
  assert.match(design, /Table columns are not globally sticky/);
  assert.match(design, /status tab is itself the status filter/);
});
