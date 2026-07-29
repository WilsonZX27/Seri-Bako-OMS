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
  assert.match(form, /grid-cols-\[minmax\(0,4fr\)_minmax\(4rem,2fr\)_minmax\(0,4fr\)\]/);
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

test("tablet portrait uses a dense 40/20/40 ledger without a persistent remarks column", () => {
  const form = read("src", "components", "stock-count-form.tsx");

  assert.match(form, /md:grid md:grid-cols-\[minmax\(0,4fr\)_minmax\(4rem,2fr\)_minmax\(0,4fr\)\]/);
  assert.match(form, /grid-cols-\[minmax\(0,4fr\)_minmax\(4rem,2fr\)_minmax\(0,4fr\)\]/);
  assert.match(form, />Variance</);
  assert.match(form, /quantityStep\(line\.uom\)/);
  assert.doesNotMatch(form, /md:col-span-4 md:order-5 lg:col-span-1/);
});

test("variance context stays optional without reintroducing the legacy review and approval chain", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const validation = read("src", "lib", "validations", "stock-count.ts");
  const detail = read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx");

  assert.match(form, /name="line_remarks"/);
  assert.doesNotMatch(form, /required=\{high\}/);
  assert.doesNotMatch(validation, /Remarks required for variance above tolerance/);
  assert.match(detail, /Confirm & Post Count/);
  assert.match(detail, /stock_count\.post/);
  assert.doesNotMatch(detail, />Review</);
  assert.doesNotMatch(detail, />Approve</);
  assert.doesNotMatch(detail, /Count Evidence Required/);
});
