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

test("outlet daily quantity labels remain readable on narrow screens", () => {
  const source = read("src/components/outlet-daily-record-form.tsx");
  for (const label of ["Qty Sent", "Received", "Wastage"]) {
    assert.match(source, new RegExp(`whitespace-normal[^>]*>${label}<`));
  }
});
