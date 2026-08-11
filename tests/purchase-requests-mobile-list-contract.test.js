const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-requests", "page.tsx"), "utf8");
const tabs = fs.readFileSync(path.join(root, "src", "components", "status-tabs.tsx"), "utf8");
const workspace = fs.readFileSync(path.join(root, "src", "components", "layout", "workspace-layout.tsx"), "utf8");

test("purchase-request list uses device-appropriate list surfaces and anchors the request identity", () => {
  assert.match(page, /<Table mobileHidden aria-label="Purchase requests" stickyColumn="third">/);
  assert.match(page, /<OperationalList ariaLabel="Purchase requests">/);
  assert.match(page, /<FilterBar resultCount=/);
});

test("purchase-request creation remains permission guarded", () => {
  assert.match(page, /permissions\["pr\.create"\]/);
  assert.match(page, /permissions\["pr\.create"\][\s\S]*href="\/purchase-requests\/new"/);
  assert.match(page, /data-mobile-primary-action/);
});

test("phone list clears fixed actions and keeps the active status visible", () => {
  assert.match(workspace, /rightRail && !hideMobileConsole && "pb-32 xl:pb-3"/);
  assert.match(tabs, /matchMedia\("\(max-width: 767px\)"\)/);
  assert.match(tabs, /scrollIntoView\(\{ block: "nearest", inline: "center" \}\)/);
  assert.match(tabs, /ref=\{tabsRef\}/);
  assert.match(page, /hideMobileConsole/);
});
