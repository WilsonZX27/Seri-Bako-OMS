const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("recipe detail presents its five operational metrics as one compact summary surface", () => {
  const page = fs.readFileSync(path.join(process.cwd(), "src/app/(app)/recipes/[id]/page.tsx"), "utf8");

  assert.match(page, /aria-labelledby="recipe-summary"/);
  assert.match(page, /<dl className="grid grid-cols-6 xl:grid-cols-5">/);
  assert.match(page, /font-mono text-sm font-semibold/);
  assert.doesNotMatch(page, /CardContent className="text-2xl font-semibold">v\{recipe\.version\}/);
});
