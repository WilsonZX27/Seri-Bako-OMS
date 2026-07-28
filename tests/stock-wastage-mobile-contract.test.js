const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "app", "(app)", "stock-wastage", "page.tsx"), "utf8");

test("stock wastage exposes its supported date range through phone-friendly More filters", () => {
  assert.match(source, /FilterBarMore/);
  assert.match(source, /name="from" type="date"/);
  assert.match(source, /name="to" type="date"/);
  assert.match(source, /activeCount=\{Number\(Boolean\(filters\.from\)\) \+ Number\(Boolean\(filters\.to\)\)\}/);
});
