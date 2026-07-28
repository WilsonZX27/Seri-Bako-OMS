const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("lint uses the maintained ESLint CLI against product source only", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  assert.equal(packageJson.scripts.lint, "eslint src");
  assert.doesNotMatch(packageJson.scripts.lint, /next lint/);
});
