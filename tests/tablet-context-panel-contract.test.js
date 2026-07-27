const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("tablet workspace context stays on-demand without consuming a full action row", () => {
  const source = fs.readFileSync("src/components/layout/workspace-layout.tsx", "utf8");
  assert.match(source, /data-tablet-context/);
  assert.match(source, /md:w-fit/);
  assert.match(source, /absolute right-0 z-\[var\(--sb-z-dropdown\)\]/);
  assert.match(source, /max-h-\[calc\(100dvh-8rem\)\]/);
  assert.match(source, /overflow-y-auto/);
  assert.match(source, /focus-visible:ring-\[var\(--sb-green-700\)\]/);
  assert.match(source, /w-\[min\(22rem,calc\(100vw-2rem\)\)\]/);
  assert.match(source, /xl:hidden/);
});
