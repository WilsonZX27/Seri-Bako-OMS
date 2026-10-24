const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("mobile operational hub preserves complete business labels", () => {
  const source = read("src/components/operational-hub.tsx");
  assert.doesNotMatch(source, /\btruncate\b/);
  assert.match(source, /break-words/);
});

test("outlet daily quantities use one stable shared heading row", () => {
  const source = read("src/components/outlet-daily-record-form.tsx");
  assert.match(source, /Qty Sent/);
  assert.match(source, /Qty Receive/);
  assert.match(source, /consumptionLabel/);
  assert.match(source, /grid-cols-3 items-end/);
  assert.match(source, /sb-daily-line-head/);
  assert.match(source, /sb-daily-line-four/);
  assert.match(read("src/app/design-system-v2.css"), /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(source, /Review the prefilled values/);
});
