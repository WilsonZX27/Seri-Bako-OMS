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
  assert.match(form, /Review prefilled values/);
  assert.match(form, /grid-cols-1 gap-3 sm:grid-cols-\[minmax\(0,1fr\)_6\.5rem\]/);
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

test("variance context stays optional while high-variance approval remains separately controlled", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const validation = read("src", "lib", "validations", "stock-count.ts");
  const approval = read("supabase", "migrations", "079_inventory_go_live_hardening.sql");

  assert.match(form, /Variance note/);
  assert.doesNotMatch(form, /required=\{high\}/);
  assert.doesNotMatch(validation, /Remarks required for variance above tolerance/);
  assert.match(approval, /Attach the stock count variance report before approving this stock count/);
});
