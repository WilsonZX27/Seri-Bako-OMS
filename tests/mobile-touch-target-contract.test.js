const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("phone filter and task controls share the larger touch contract", () => {
  const css = fs.readFileSync("src/app/globals.css", "utf8") + fs.readFileSync("src/app/design-system-v2.css", "utf8");

  const phoneRules = css.match(/@media \(max-width: 767px\)[\s\S]*?--sb-control-height: 3rem;/g) ?? [];
  assert.equal(phoneRules.length, 1, "the phone touch token has one canonical responsive owner");
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.sb-list-filters:not\(\.sb-list-query-card\) input,[\s\S]*?height: var\(--sb-control-height\);[\s\S]*?min-height: var\(--sb-control-height\);/);
  assert.match(css, /\.sb-list-filters:not\(\.sb-list-query-card\) > button:is\(\[type="submit"\], :not\(\[type\]\)\) \{[\s\S]*?order: 4;/);
  assert.match(css, /\.sb-filter-summary \{[\s\S]*?order: 5;/);
  assert.doesNotMatch(css, /data-sticky-column="last"/);
  const design = fs.readFileSync("src/app/design-system-v2.css", "utf8");
  assert.match(design, /@media \(min-width: 1024px\)[\s\S]*?--sb-control-height: 2\.25rem/);
  assert.match(design, /@media \(min-width: 768px\)[\s\S]*?form\.sb-list-query-card[\s\S]*?height: 2\.25rem !important[\s\S]*?data-right-console/);
  assert.match(design, /@media \(max-width: 639px\)[\s\S]*?height: 44px !important/);
});

test("phone account actions keep touch targets large and search degrades without unhandled requests", () => {
  const account = fs.readFileSync("src/components/layout/account-menu.tsx", "utf8");
  const search = fs.readFileSync("src/components/search/global-search.tsx", "utf8");

  assert.match(account, /h-12 w-12/);
  assert.doesNotMatch(account, /sm:h-8/);
  assert.match(account, /min-h-12/);
  assert.match(search, /AbortController/);
  assert.match(search, /response\.ok/);
  assert.match(search, /controller\.abort\(\)/);
});

test("shared popup and directory actions inherit the device control-height contract", () => {
  const reports = fs.readFileSync("src/app/(app)/reports/page.tsx", "utf8");
  const select = fs.readFileSync("src/components/ui/select-control.tsx", "utf8");
  const activityMenu = fs.readFileSync("src/components/layout/top-bar-activity-menu.tsx", "utf8");

  assert.doesNotMatch(reports, /className="h-8 px-2 text-xs"/);
  assert.match(select, /min-h-\[var\(--sb-control-height\)\]/);
  assert.match(activityMenu, /min-h-\[var\(--sb-control-height\)\]/);
});
