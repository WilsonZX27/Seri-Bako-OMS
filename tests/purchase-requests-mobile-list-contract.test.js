const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-requests", "page.tsx"), "utf8");
const tabs = fs.readFileSync(path.join(root, "src", "components", "status-tabs.tsx"), "utf8");
const workspace = fs.readFileSync(path.join(root, "src", "components", "layout", "workspace-layout.tsx"), "utf8");

test("purchase-request list uses device-appropriate list surfaces and anchors the request identity", () => {
  assert.match(page, /<Table mobileHidden compactUntil="xl" aria-label="Purchase requests" stickyColumn="third">/);
  assert.match(page, /<OperationalList ariaLabel="Purchase requests" showUntil="xl">/);
  assert.match(page, /tabletRailBreakpoint="md"/);
  assert.match(page, /<FilterBar resetHref="\/purchase-requests"/);
  assert.match(page, /resultCount=\{requests\?\.totalRows\}/);
});

test("purchase-request creation remains permission guarded", () => {
  assert.match(page, /permissions\["pr\.create"\]/);
  assert.match(page, /ConsoleSection title="Actions"/);
  assert.match(page, /href="\/purchase-requests\/new"/);
});

test("phone list clears fixed actions and keeps the active status visible", () => {
  assert.match(workspace, /rightRail && !hideMobileConsole && "pb-32 xl:pb-3"/);
  assert.match(tabs, /SelectControl/);
  assert.match(tabs, /value=\{selected\}/);
  assert.match(tabs, /options=\{tabs\}/);
  assert.match(page, /hideMobileConsole/);
});
