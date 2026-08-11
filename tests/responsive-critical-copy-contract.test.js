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
  for (const label of ["Qty Sent", "Received", "Wastage"]) {
    assert.match(source, new RegExp(`<span>${label}</span>`));
  }
  assert.match(source, /grid-cols-3/);
  assert.match(source, /md:grid-cols-\[minmax\(12rem,1fr\)_repeat\(3,minmax\(4\.5rem,6rem\)\)\]/);
  assert.doesNotMatch(source, /Review the prefilled values/);
});
