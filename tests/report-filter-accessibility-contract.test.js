const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const reportPages = [
  "src/app/(app)/reports/demand-trends/page.tsx",
  "src/app/(app)/reports/procurement-variance/page.tsx",
  "src/app/(app)/reports/product-margin/page.tsx",
  "src/app/(app)/reports/recipe-costing/page.tsx",
  "src/app/(app)/reports/costing-readiness/page.tsx",
];

test("report filter controls expose stable accessible names", () => {
  for (const file of reportPages) {
    const source = read(file);
    const selects = source.match(/<SelectNative\b[^>]*>/g) ?? [];
    assert.ok(selects.length > 0, `${file} must keep its report filters`);
    for (const select of selects) {
      assert.match(select, /aria-label=/, `${file} has an unnamed report select: ${select}`);
    }
  }
});

test("recipe costing uses the shared labelled search control", () => {
  const source = read("src/app/(app)/reports/recipe-costing/page.tsx");
  assert.match(source, /import \{ Input \} from "@\/components\/ui\/input"/);
  assert.match(source, /<Input name="search"[^>]*aria-label="Search recipes"/);
  assert.doesNotMatch(source, /<input name="search"/);
});
