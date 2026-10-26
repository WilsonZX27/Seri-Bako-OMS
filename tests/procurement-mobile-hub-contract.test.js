const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "app", "(app)", "procurement", "page.tsx"),
  "utf8",
);
const query = fs.readFileSync(
  path.join(__dirname, "..", "src", "server", "queries", "procurement.ts"),
  "utf8",
);

test("procurement mobile hub preserves role and permission isolation", () => {
  assert.match(source, /module\.roles\.includes\(insights\.role as never\)/);
  assert.match(source, /permissions\[module\.permission\]/);
  assert.match(source, /const counters = countersByRole\[insights\.role/);
  assert.match(source, /tools=\{visibleModules\.map/);
});

test("purchase-request creation is promoted only when permitted", () => {
  assert.match(source, /const canCreatePr = permissions\["purchase_request\.create"\]/);
  assert.match(source, /primaryAction=\{canCreatePr/);
  assert.match(source, /href: "\/purchase-requests\/new", label: "Start purchase request"/);
});

test("procurement redesign is phone-only and keeps the desktop workspace", () => {
  assert.match(source, /<div className="md:hidden">\s*\n?\s*<OperationalHub/);
  assert.match(source, /<OperationalOverview id="procurement-overview"/);
  assert.match(source, /<OperationalActionGrid id="procurement-queue"/);
  assert.match(source, /<WorkspaceGrid[\s\S]*?rightRail=/);
  assert.match(source, /pb-24 md:pb-0/);
});

test("procurement insight query never converts a failed counter into zero", () => {
  assert.match(query, /result\.error \? null : result\.count \?\? 0/);
  assert.match(query, /unavailable: results\.some/);
  assert.match(source, /Some procurement counters are temporarily unavailable/);
  assert.match(source, /displayCounterValue/);
});
