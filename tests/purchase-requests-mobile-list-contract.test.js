const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-requests", "page.tsx"), "utf8");
const tabs = fs.readFileSync(path.join(root, "src", "components", "status-tabs.tsx"), "utf8");
const workspace = fs.readFileSync(path.join(root, "src", "components", "layout", "workspace-layout.tsx"), "utf8");

test("purchase-request list uses device-appropriate list surfaces and anchors the request identity", () => {
  assert.match(page, /<Table className="sb-purchase-request-table" mobileHidden compactUntil="xl" aria-label="Purchase requests" stickyColumn="third">/);
  assert.match(page, /<TableSelectionHead><BulkSelectAllCheckbox \/><\/TableSelectionHead>/);
  assert.match(page, /<SortableHead label="PR number \/ Priority" column="request_no"/);
  assert.match(page, /<TableSelectionCell><BulkSelectRowCheckbox id=\{request\.id\} \/><\/TableSelectionCell>[\s\S]*<TableActionLink[\s\S]*<DocumentNumber/);
  assert.match(page, /className="sb-pr-tablet-rows" role="list" aria-label="Purchase requests"/);
  assert.match(page, /className="sb-pr-continuous-rows"/);
  assert.match(page, /className="sb-pr-phone-supplier-row"/);
  assert.match(page, /sb-pr-phone-amount/);
  const design = fs.readFileSync(path.join(root, "src", "app", "design-system-v2.css"), "utf8");
  assert.match(design, /\.sb-pr-phone-supplier-row,[\s\S]*font-size: \.6875rem/);
  assert.match(design, /\.sb-pr-phone-amount \{[^}]*font-size: \.6875rem/);
  assert.match(page, /tabletRailBreakpoint="md"/);
  assert.match(page, /<FilterBar resetHref="\/purchase-requests"/);
  assert.match(page, /resultCount=\{requests\?\.totalRows\}/);
  assert.match(page, /\{request\.requested_by_name/);
  assert.doesNotMatch(page, /Submitted by/);
  assert.match(page, /request\.supplier_state/);
});

test("purchase-request creation remains permission guarded", () => {
  assert.match(page, /permissions\["pr\.create"\]/);
  assert.match(page, /ConsoleSection title="Actions"/);
  assert.match(page, /href="\/purchase-requests\/new"/);
});

test("phone list clears fixed actions and keeps the active status visible", () => {
  assert.doesNotMatch(workspace, /pb-32/);
  assert.match(workspace, /rightRail && !hideMobileConsole && "xl:pb-3"/);
  assert.match(tabs, /SelectControl/);
  assert.match(tabs, /value=\{selected\}/);
  assert.match(tabs, /options=\{tabs\}/);
  assert.match(page, /hideMobileConsole/);
});
