const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("continuous loading motion respects the operating-system reduced-motion preference", () => {
  const globals = read("src/app/globals.css");
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(globals, /animation-duration: 0\.01ms !important/);
  assert.match(globals, /animation-iteration-count: 1 !important/);
  assert.match(globals, /transition-duration: 0\.01ms !important/);
  assert.match(globals, /scroll-behavior: auto !important/);
});

test("finance report skeletons expose an atomic named loading status", () => {
  for (const file of [
    "src/app/(app)/supplier-invoices/aging/loading.tsx",
    "src/app/(app)/supplier-invoices/cash-flow/loading.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /role="status"/);
    assert.match(source, /aria-live="polite"/);
    assert.match(source, /aria-atomic="true"/);
    assert.match(source, /aria-busy="true"/);
    assert.match(source, /<p className="sr-only">Loading [^<]+…<\/p>/);
  }
});
