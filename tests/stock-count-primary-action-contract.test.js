const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(process.cwd(), "src/components/stock-count-form.tsx"), "utf8");

test("stock count exposes one primary submit source at each responsive band", () => {
  assert.match(source, /className="hidden xl:inline-flex"/);
  assert.match(source, /sb-mobile-action-bar[\s\S]*?xl:hidden/);
  assert.match(source, /h-12 w-12[\s\S]*?md:h-\[var\(--sb-control-height\)\] md:w-\[var\(--sb-control-height\)\]/);
  assert.match(source, /min-h-12 px-1 py-1 text-xs font-medium text-muted-foreground/);
  assert.match(source, /summary className="flex min-h-12 cursor-pointer items-center text-sm font-medium/);
  assert.doesNotMatch(source, /className="hidden md:inline-flex"/);
});
