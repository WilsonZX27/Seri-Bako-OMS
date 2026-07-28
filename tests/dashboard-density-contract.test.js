const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("dashboard metrics remain panel content instead of nested cards", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/components/dashboard-workspace.tsx"), "utf8");
  const metric = source.slice(source.indexOf("function Metric"), source.indexOf("function Panel"));

  assert.match(metric, /min-h-\[var\(--sb-control-height\)\]/);
  assert.match(metric, /hover:bg-\[var\(--sb-surface-muted\)\]/);
  assert.doesNotMatch(metric, /rounded-\[2px\] border border-\[var\(--sb-border-soft\)\] bg-white/);
  assert.doesNotMatch(source, /xl:hidden"><Link href=\{primaryAction\.href\}/);
});

test("dashboard degrades optional reads instead of replacing the whole workdesk", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/server/queries/dashboard.ts"), "utf8");

  assert.match(source, /A dashboard is a situational overview/);
  assert.match(source, /warnOptionalQuery\(name, result\.error\)/);
  assert.doesNotMatch(source, /for \(const result of \[transactions, stockItems, suppliers, items, urgentRequests, purchaseRequests, purchaseOrders, documents\]\)[\s\S]*?throw new Error/);
});
