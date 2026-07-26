const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("outlet daily rows retain the next operational step and wastage signal on phones", () => {
  const source = read("src/app/(app)/outlet-daily-records/page.tsx");

  assert.match(source, /statusGuidance\(row\.status\)/);
  assert.match(source, /row\.total_wastage > 0/);
  assert.match(source, /formatNumber\(row\.total_received\)\} received/);
});

test("production jobs use the shared mobile status rail and reserve FAB clearance", () => {
  const source = read("src/app/(app)/production/jobs/page.tsx");

  assert.match(source, /<StatusTabs/);
  assert.match(source, /className="md:hidden"/);
  assert.match(source, /hidden flex-wrap gap-2 md:flex/);
  assert.match(source, /canCreate \? "pb-32" : "pb-4"/);
});

test("stock count keeps setup separate from one continuous phone work surface", () => {
  const source = read("src/components/stock-count-form.tsx");
  const design = read("DESIGN.md");

  assert.match(source, /data-stock-count-setup/);
  assert.match(source, /data-stock-count-workspace/);
  assert.match(source, /data-stock-count-line-list/);
  assert.match(source, /border-b border-\[var\(--sb-border-soft\)\]/);
  assert.match(design, /A phone workflow uses one boundary per operational unit/);
  assert.match(design, /Do not place a bordered or shadowed card inside another card/);
});
