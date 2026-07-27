const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("dashboard metrics remain panel content instead of nested cards", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/components/dashboard-workspace.tsx"), "utf8");
  const metric = source.slice(source.indexOf("function Metric"), source.indexOf("function Panel"));

  assert.match(metric, /min-h-11/);
  assert.match(metric, /hover:bg-\[var\(--sb-surface-muted\)\]/);
  assert.doesNotMatch(metric, /rounded-\[2px\] border border-\[var\(--sb-border-soft\)\] bg-white/);
  assert.doesNotMatch(source, /xl:hidden"><Link href=\{primaryAction\.href\}/);
});
