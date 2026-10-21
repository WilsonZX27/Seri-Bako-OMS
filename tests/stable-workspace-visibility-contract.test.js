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

test("outlet daily create has one permission-scoped phone FAB from the action rail", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");

  assert.match(page, /<WorkspaceGrid(?:\s+className="[^"]*")?\s+hideMobileConsole\s+rightRail=/);
  assert.match(page, /canCreate \? <Button[^>]*data-mobile-primary-action><Link href="\/outlet-daily-records\/new"/);
  assert.doesNotMatch(page, /<PageHeader[^>]*action=\{canCreate/);
  assert.match(read("src/components/layout/right-console.tsx"), /content && hasCreateFab && primaryHref/);
  assert.doesNotMatch(page, /phoneEndAction=/);
});

test("reviewed operational lists leave phone creation to their existing action rail", () => {
  for (const [route, destination] of [
    ["people", "/staffs/new"],
    ["purchase-orders", "/purchase-orders/new"],
    ["stock-counts", "/stock-counts/new"],
    ["goods-receivings", "/goods-receivings/new"],
    ["branches", "/branches/new"],
    ["stock-wastage", "/stock-wastage/new"],
  ]) {
    const page = read(`src/app/(app)/${route}/page.tsx`);
    const header = page.slice(page.indexOf("<PageHeader"), page.indexOf("<WorkspaceGrid", page.indexOf("<PageHeader")));
    assert.doesNotMatch(header, /action=/, `${route} must not render a second create FAB in PageHeader`);
    assert.match(page, /data-mobile-primary-action/, `${route} must retain its primary rail action`);
    assert.ok(page.includes(`href="${destination}"`), `${route} must retain its create destination`);
  }
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
