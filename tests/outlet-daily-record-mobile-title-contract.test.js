const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { test } = require("node:test");

const page = fs.readFileSync(
  path.resolve(__dirname, "..", "src", "app", "(app)", "outlet-daily-records", "new", "page.tsx"),
  "utf8",
);

test("new outlet daily records keep the document title separate from the record date", () => {
  assert.match(page, /documentNo="New Outlet Daily Record"/);
  assert.doesNotMatch(page, /documentNo=\{recordDate\}/);
  assert.match(page, /recordDate=\{recordDate\}/);
});
