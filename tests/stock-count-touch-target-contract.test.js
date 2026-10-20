const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "components", "stock-count-form.tsx"), "utf8");

test("stock count steppers use phone-safe touch targets and stable labels", () => {
  assert.match(source, /className="flex h-10 w-10 shrink-0 items-center justify-center[^\"]*"[^>]*onClick=\{\(\) => adjustPhysicalQty\(line\.item_id, -1\)\}/);
  assert.match(source, /className="flex h-10 w-10 shrink-0 items-center justify-center[^\"]*"[^>]*onClick=\{\(\) => adjustPhysicalQty\(line\.item_id, 1\)\}/);
  assert.match(source, /className="h-10 w-full min-w-10 flex-1/);
  assert.match(source, /aria-label=\{`Decrease physical quantity for \$\{line\.item_name\}`\}/);
  assert.match(source, /aria-label=\{`Increase physical quantity for \$\{line\.item_name\}`\}/);
  assert.match(source, /placeholder=\{line\.prefill_source === "unavailable" \? "Count" : "0\.000"\}/);
});

// Responsive geometry is verified in the browser; literal Tailwind strings
// do not establish whether the quantity controls fit their cards.

test("stock count add-item action keeps a practical mobile target", () => {
  assert.match(source, /\[&_button\]:min-h-9/);
});
