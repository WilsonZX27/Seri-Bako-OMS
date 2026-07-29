const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "../src/components/workflow-status-pipeline.tsx"), "utf8");

test("workflow labels use equal tracks and connectors do not shift their centers", () => {
  assert.match(source, /gridTemplateColumns: `repeat\(\$\{steps\.length\}, minmax\(0, 1fr\)\)`/);
  assert.match(source, /absolute left-1\/2 top-1\/2/);
  assert.match(source, /relative z-\[1\][^"]*bg-white/);
  assert.doesNotMatch(source, /mx-2 h-px min-w-3 flex-1/);
});
