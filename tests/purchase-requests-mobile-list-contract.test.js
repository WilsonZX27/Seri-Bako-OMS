const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src", "app", "(app)", "purchase-requests", "page.tsx"), "utf8");
const tabs = fs.readFileSync(path.join(root, "src", "components", "status-tabs.tsx"), "utf8");
const workspace = fs.readFileSync(path.join(root, "src", "components", "layout", "workspace-layout.tsx"), "utf8");
const design = fs.readFileSync(path.join(root, "src", "app", "design-system-v2.css"), "utf8");

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("purchase-request list uses device-appropriate list surfaces and anchors the request identity", () => {
  assert.match(page, /<Table className="sb-purchase-request-table" mobileHidden compactUntil="xl" aria-label="Purchase requests" stickyColumn="third">/);
  assert.match(page, /<TableSelectionHead><BulkSelectAllCheckbox \/><\/TableSelectionHead>/);
  assert.match(page, /<SortableHead label="PR number \/ Priority" column="request_no"/);
  assert.match(page, /<TableSelectionCell><BulkSelectRowCheckbox id=\{request\.id\} \/><\/TableSelectionCell>[\s\S]*<TableActionLink[\s\S]*<DocumentNumber/);
  assert.match(page, /<OperationalList ariaLabel="Purchase requests" showUntil="xl" className="sb-pr-continuous-rows">/);
  assert.match(page, /tabletRailBreakpoint="md"/);
  assert.match(page, /<FilterBar key=\{JSON\.stringify\(\[filters\.search, filters\.status, filters\.priority\]\)\} resetHref="\/purchase-requests"/);
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

test("compact PR metadata keeps 11px type legible on both striped row surfaces", () => {
  const ink = design.match(/--sb-pr-meta-ink:\s*(#[0-9a-f]{6})/i)?.[1];
  const striped = design.match(/\.sb-pr-continuous-rows > \[role="listitem"\]:nth-child\(even\) \{ background: (#[0-9a-f]{6}); \}/i)?.[1];
  assert.ok(ink && striped, "Scoped PR metadata ink and alternate surface must be explicit");
  assert.match(design, /\.sb-pr-phone-supplier-row,[\s\S]*?\.sb-pr-phone-location-row \{[\s\S]*?color: var\(--sb-pr-meta-ink\);/);
  assert.match(design, /\.sb-pr-phone-byline-date \{[\s\S]*?color: var\(--sb-pr-meta-ink\);/);
  assert.match(design, /\.sb-pr-phone-amount \{[^}]*font-size: \.6875rem/);
  assert.match(design, /@media \(max-width: 639px\) \{[\s\S]*?\.sb-pr-phone-supplier \{ grid-column: 1 \/ -1; \}[\s\S]*?\.sb-pr-phone-amount \{ grid-column: 2; \}/);
  for (const background of ["#ffffff", striped]) {
    assert.ok(contrast(ink, background) >= 4.5, `${ink} must meet 4.5:1 on ${background}`);
  }
});
