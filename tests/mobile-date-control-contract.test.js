const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("shared phone date controls retain the design-system touch treatment", () => {
  const input = read("src/components/ui/input.tsx");
  const design = read("DESIGN.md");

  assert.match(input, /h-\[var\(--sb-control-height\)\]/);
  assert.match(input, /rounded-\[var\(--sb-radius-control\)\]/);
  assert.match(input, /focus-visible:ring-\[var\(--sb-green-700\)\]/);
  assert.match(design, /Date fields use the shared `Input` control/);
});
