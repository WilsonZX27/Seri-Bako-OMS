const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "components", "stock-count-form.tsx"), "utf8");

test("stock count steppers use a compact mobile control and stable labels", () => {
  assert.match(source, /className="flex h-9 w-9 shrink-0 items-center justify-center[^\"]*lg:h-10 lg:w-10[^\"]*"[^>]*onClick=\{\(\) => adjustPhysicalQty\(line\.item_id, -1\)\}/);
  assert.match(source, /className="flex h-9 w-9 shrink-0 items-center justify-center[^\"]*lg:h-10 lg:w-10[^\"]*"[^>]*onClick=\{\(\) => adjustPhysicalQty\(line\.item_id, 1\)\}/);
  assert.match(source, /aria-label=\{`Decrease physical quantity for \$\{line\.item_name\}`\}/);
  assert.match(source, /aria-label=\{`Increase physical quantity for \$\{line\.item_name\}`\}/);
});

test("stock count mobile lines use a two-column card instead of a tall single-column sheet", () => {
  assert.match(source, /grid grid-cols-2 gap-2 p-2 sm:block sm:divide-y/);
  assert.match(source, /grid min-h-\[13rem\] grid-cols-\[minmax\(0,1fr\)_auto\] content-between/);
  assert.match(source, /rounded-\[var\(--sb-control-radius\)\]/);
});
