const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("outlet daily and stock count routes show source-aware loading states", () => {
  const outlet = read("src", "app", "(app)", "outlet-daily-records", "loading.tsx");
  const list = read("src", "app", "(app)", "stock-counts", "loading.tsx");
  const create = read("src", "app", "(app)", "stock-counts", "new", "loading.tsx");
  for (const source of [outlet, list, create]) {
    assert.match(source, /role="status"/);
    assert.match(source, /aria-busy="true"/);
    assert.match(source, /animate-pulse/);
    assert.doesNotMatch(source, /Loading .*0/);
  }
  assert.match(outlet, /Verified quantities will appear/);
  assert.match(create, /latest verified source data/);
});
