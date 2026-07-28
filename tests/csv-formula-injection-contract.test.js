const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/server/backup/export.ts", "utf8");

test("shared CSV export encoding neutralises spreadsheet formula markers", () => {
  assert.ok(source.includes("const safeText = /^[=+\\-@]/.test(text)"));
  assert.ok(source.includes("? `'${text}` : text"));
  assert.ok(source.includes("return /[\",\\r\\n]/.test(safeText)"));
});
