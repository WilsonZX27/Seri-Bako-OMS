const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("stock count rows expose and emphasize variance", () => {
  const source = read("src/app/(app)/stock-counts/page.tsx");

  assert.match(source, /row\.line_count.*row\.high_variance_count/s);
  assert.match(source, /row\.high_variance_count > 0/);
  assert.match(source, /var\(--sb-warning\)/);
});

test("transfer and wastage rows retain operational line counts", () => {
  const transfer = read("src/app/(app)/stock-transfers/page.tsx");
  const wastage = read("src/app/(app)/stock-wastage/page.tsx");

  assert.match(transfer, /row\.transfer_date.*row\.line_count/s);
  assert.match(wastage, /row\.wastage_date.*row\.line_count/s);
});

test("stock wastage keeps a labelled compact filter and role-aware empty guidance", () => {
  const source = read("src/app/(app)/stock-wastage/page.tsx");
  const styles = read("src/app/design-system-v2.css");
  assert.match(source, /className="sb-stock-wastage-query"/);
  assert.match(source, /activeCount=\{activeFilterCount\}/);
  assert.match(source, /aria-label="Search wastage number, reason, or branch"/);
  assert.match(source, /Create a wastage document for expired, damaged, missing, or abnormal stock loss at a branch/);
  assert.match(source, /Wastage documents recorded by your team will appear here/);
  assert.match(styles, /\.sb-goods-receiving-query,\.sb-stock-wastage-query/);
});
