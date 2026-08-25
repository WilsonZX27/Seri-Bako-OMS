const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("stock count starts from a visible historical or ledger prefill instead of an empty repeated-entry sheet", () => {
  const query = read("src", "server", "queries", "stock-counts.ts");
  const form = read("src", "components", "stock-count-form.tsx");
  const design = read("DESIGN.md");

  assert.match(query, /eq\("status", "posted"\)/);
  assert.match(query, /prefill_source/);
  assert.match(query, /last_posted_count/);
  assert.match(form, /seedLines\.map\(makeEditableLine\)/);
  assert.match(form, /prefill_source/);
  assert.equal(
    (form.match(/lg:grid-cols-\[minmax\(12rem,1fr\)_5rem_minmax\(14rem,17rem\)\]/g) ?? []).length,
    2,
    "the Stock Count heading and rows must share the same tablet column template",
  );
  assert.match(design, /latest posted physical result/);
});

test("stock count uses direct plus/minus adjustments and protects discrete quantities from fractions", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const validation = read("src", "lib", "validations", "stock-count.ts");

  assert.match(form, /adjustPhysicalQty/);
  assert.match(form, /Decrease physical quantity/);
  assert.match(form, /Increase physical quantity/);
  assert.match(form, /quantityStep\(line\.uom\)/);
  assert.match(validation, /stockCountAllowsFraction/);
  assert.match(validation, /quantities must be whole numbers/);
});

test("tablet portrait keeps the count control below item context until the content rail is wide enough", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const styles = read("src", "app", "design-system-v2.css");

  assert.equal(
    (form.match(/lg:grid-cols-\[minmax\(12rem,1fr\)_5rem_minmax\(14rem,17rem\)\]/g) ?? []).length,
    2,
  );
  assert.equal(
    (form.match(/xl:grid-cols-\[minmax\(16rem,1fr\)_5rem_minmax\(16rem,18rem\)\]/g) ?? []).length,
    2,
  );
  assert.match(form, /lg:justify-self-stretch/);
  assert.doesNotMatch(form, /md:max-w-64/);
  assert.match(form, /h-10 w-full min-w-10 flex-1/);
  assert.doesNotMatch(form, /md:min-w-\[7\.5rem\]/);
  assert.match(form, /data-mobile-document-action[\s\S]*md:hidden/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\[data-mobile-document-action\]\.sb-mobile-action-bar/);
  assert.match(form, />Variance</);
  assert.match(form, /quantityStep\(line\.uom\)/);
  assert.doesNotMatch(form, /md:col-span-4 md:order-5 lg:col-span-1/);
});

test("variance context stays optional while line changes use bounded guided approval", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const validation = read("src", "lib", "validations", "stock-count.ts");
  const detail = read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx");

  assert.match(form, /name="line_remarks"/);
  assert.doesNotMatch(form, /required=\{high\}/);
  assert.doesNotMatch(validation, /Remarks required for variance above tolerance/);
  assert.match(detail, /Confirm & Post Count/);
  assert.match(detail, /stock_count\.post/);
  assert.match(detail, /pendingRevisions/);
  assert.match(detail, /resolveStockCountLineRevision/);
  assert.doesNotMatch(detail, /Count Evidence Required/);
});

test("stock count refuses incomplete source values instead of defaulting them to zero", () => {
  const action = read("src", "server", "actions", "stock-counts.ts");
  const query = read("src", "server", "queries", "stock-counts.ts");

  assert.match(action, /Stock Count lines are still loading/);
  assert.match(action, /physical\.some\(\(value\) => value\.trim\(\) === ""\)/);
  assert.match(query, /Stock Count starting balances are unavailable/);
  assert.doesNotMatch(action, /theoretical_qty: theoretical\[index\] \?\? 0/);
  assert.doesNotMatch(action, /physical_qty: physical\[index\] \?\? 0/);
});

test("stock count creation fails visibly when starting balances are unavailable", () => {
  const page = read("src", "app", "(app)", "stock-counts", "new", "page.tsx");
  assert.match(page, /sourceUnavailable/);
  assert.match(page, /Starting balances unavailable/);
  assert.match(page, /no zero values have been substituted/);
  assert.match(page, /sourceUnavailable \? null/);
  assert.match(page, /No active branch is available/);
});

test("stock count does not render an undefined zero-denominator variance as 0%", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  assert.match(form, /percent === null \|\| Number\.isNaN\(percent\)\) return "—"/);
  assert.doesNotMatch(form, /percent === null \|\| Number\.isNaN\(percent\)\) return "0%"/);
});

test("stock count item positions follow the current visible order while item code remains the stable identity", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  assert.match(form, /visibleLines\.map\(\(line, visibleIndex\)/);
  assert.match(form, /const displayIndex = visibleIndex \+ 1/);
  assert.doesNotMatch(form, /displayIndexByItemId/);
  assert.match(form, /aria-label=\{`Item \$\{displayIndex\}`\}/);
});

test("stock count uses exact variance without an operator tolerance setting", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const action = read("src", "server", "actions", "stock-counts.ts");
  const validation = read("src", "lib", "validations", "stock-count.ts");

  assert.doesNotMatch(form, /Tolerance %/);
  assert.match(form, /name="tolerance_percent" value="0"/);
  assert.match(action, /tolerance_percent: 0/);
  assert.match(validation, /tolerance_percent: z\.literal\(0\)\.default\(0\)/);
});
