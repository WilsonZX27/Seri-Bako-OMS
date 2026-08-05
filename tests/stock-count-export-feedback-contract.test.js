const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync(
  path.join(process.cwd(), "src/components/stock-count-export-dialog.tsx"),
  "utf8",
);

test("stock count workbook export has traceable asynchronous feedback", () => {
  assert.match(source, /onSubmit=\{handleExport\}/);
  assert.match(source, /if \(isPreparing\) return/);
  assert.match(source, /aria-busy=\{isPreparing\}/);
  assert.match(source, /Preparing\.\.\./);
  assert.match(source, /await fetch\(url/);
});

test("stock count workbook export exposes a single accessible error", () => {
  assert.match(source, /role="alert"/);
  assert.match(source, /setError\(null\)/);
  assert.match(source, /response\.ok/);
});
