const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "components", "stock-count-form.tsx"), "utf8");

test("stock count steppers use a compact mobile control and stable labels", () => {
  assert.match(source, /className="flex h-9 w-9 shrink-0 items-center justify-center[^\"]*md:h-10 md:w-10[^\"]*"[^>]*onClick=\{\(\) => adjustPhysicalQty\(line\.item_id, -1\)\}/);
  assert.match(source, /className="flex h-9 w-9 shrink-0 items-center justify-center[^\"]*md:h-10 md:w-10[^\"]*"[^>]*onClick=\{\(\) => adjustPhysicalQty\(line\.item_id, 1\)\}/);
  assert.match(source, /aria-label=\{`Decrease physical quantity for \$\{line\.item_name\}`\}/);
  assert.match(source, /aria-label=\{`Increase physical quantity for \$\{line\.item_name\}`\}/);
});
