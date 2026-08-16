const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("purchase request lines use one responsive control geometry and no duplicate detail save rail", () => {
  const form = read("src", "components", "procurement-forms.tsx");
  const detail = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  assert.match(form, /reserveMobileActionSpace = true/);
  assert.match(form, /space-y-2 md:col-span-1/);
  assert.match(form, /grid-cols-\[1\.75rem_minmax\(7rem,1\.15fr\)_minmax\(7rem,1fr\)_2\.75rem\]/);
  assert.match(form, /grid-cols-\[minmax\(12rem,1fr\)_8rem_8rem_6\.5rem\]/);
  assert.match(form, /h-\[var\(--sb-control-height\)\][\s\S]*w-10/);
  const design = read("src", "app", "design-system-v2.css");
  assert.match(design, /#purchase-request-form \[data-purchase-request-line\] :where\(input, select, button\)[\s\S]*height: var\(--sb-control-height\) !important/);
  assert.doesNotMatch(design, /data-purchase-request-line\] \{[\s\S]*grid-template-columns/);
  assert.match(design, /sb-list-filters--equal-controls > \.sb-filter-more > summary[\s\S]*width: 100% !important/);
  assert.match(detail, /saveDraftAction/);
  assert.match(detail, /saveDraftAction \|\| canCancel \|\| canReject \|\| deleteControl/);
  assert.match(detail, /reserveMobileActionSpace=\{false\}/);
  assert.doesNotMatch(detail, /<div className="mt-4">\s*<SubmitButton form="purchase-request-form"/);
});

test("mobile shell and loading states avoid warm bands, layout shifts, and duplicate status copy", () => {
  const topBar = read("src", "components", "layout", "top-bar.tsx");
  const layout = read("src", "app", "layout.tsx");
  const globals = read("src", "app", "globals.css");
  const outlet = read("src", "app", "(app)", "outlet-daily-records", "page.tsx");
  const stockLoading = read("src", "app", "(app)", "stock-counts", "new", "loading.tsx");
  assert.match(topBar, /sticky top-0 z-40/);
  assert.match(topBar, /bg-white/);
  assert.match(layout, /themeColor: "#ffffff"/);
  assert.match(globals, /--background: 150 12% 94%/);
  assert.doesNotMatch(outlet, /Posted · editable/);
  assert.match(stockLoading, /LoaderCircle/);
  assert.match(stockLoading, /animate-spin/);
  assert.doesNotMatch(stockLoading, /animate-pulse/);
});
