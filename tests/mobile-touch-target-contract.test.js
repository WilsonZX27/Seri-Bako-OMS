const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("phone filter controls stay compact while task controls retain the larger touch contract", () => {
  const css = fs.readFileSync("src/app/globals.css", "utf8");

  const phoneRules = css.match(/@media \(max-width: 767px\)[\s\S]*?--sb-control-height: 3rem;/g) ?? [];
  assert.ok(phoneRules.length >= 2, "the phone rule must override both default and compact control heights");
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.sb-list-filters:not\(\.sb-list-query-card\) input,[\s\S]*?height: 2\.125rem;[\s\S]*?min-height: 2\.125rem;/);
  assert.match(css, /\.sb-list-filters:not\(\.sb-list-query-card\) > button:is\(\[type="submit"\], :not\(\[type\]\)\) \{[\s\S]*?order: 4;/);
  assert.match(css, /\.sb-filter-summary \{[\s\S]*?order: 5;/);
  assert.doesNotMatch(css, /data-sticky-column="last"/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*?--sb-control-height: 2\.25rem/);
  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*?--sb-control-height: 2\.25rem/);
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
  const quickAccess = fs.readFileSync("src/components/layout/quick-access-menu.tsx", "utf8");
  const activityMenu = fs.readFileSync("src/components/layout/top-bar-activity-menu.tsx", "utf8");

  assert.doesNotMatch(reports, /className="h-8 px-2 text-xs"/);
  assert.match(select, /min-h-\[var\(--sb-control-height\)\]/);
  assert.match(quickAccess, /min-h-\[var\(--sb-control-height\)\]/);
  assert.match(activityMenu, /min-h-\[var\(--sb-control-height\)\]/);
});
