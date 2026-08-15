const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("operational workspaces never fade readable content during route streaming", () => {
  const css = read("src/app/design-system-v2.css");

  assert.doesNotMatch(css, /#main-content\s*>\s*:not\(\[data-document-workspace-header\]\)/);
  assert.doesNotMatch(css, /@keyframes\s+sb-content-enter/);
});

test("outlet daily create stays in the phone toolbar instead of covering records", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  const filterBar = read("src/components/ui/filter-bar.tsx");
  const header = read("src/components/common/UnifiedListHeader.tsx");

  assert.match(page, /<WorkspaceGrid hideMobileConsole rightRail=/);
  assert.match(page, /phoneEndAction=\{canCreate/);
  assert.match(filterBar, /phoneEndAction\?: ReactNode/);
  assert.match(header, /unified-list-end-action/);
});

test("the route matrix treats client runtime errors as release failures", () => {
  const audit = read("tests/e2e/static-workspace-layout-audit.spec.js");

  assert.match(audit, /page\.on\("pageerror"/);
  assert.match(audit, /message\.type\(\) === "error"/);
  assert.match(audit, /must not emit browser runtime errors/);
});

test("recipe costing empty states never claim that absent results are ready", () => {
  const page = read("src/app/(app)/reports/recipe-costing/page.tsx");

  assert.match(page, /No recipe costs match these filters/);
  assert.match(page, /No active recipes to cost/);
  assert.doesNotMatch(page, /Recipe costs are ready for review/);
});

test("product margin empty states distinguish missing products from filtered results", () => {
  const page = read("src/app/(app)/reports/product-margin/page.tsx");

  assert.match(page, /No product margins match these filters/);
  assert.match(page, /No active products to review/);
  assert.match(page, /Clear or widen the filters/);
  assert.doesNotMatch(page, /Product margins are ready for review/);
});
