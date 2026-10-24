const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const page = fs.readFileSync(path.join(__dirname, "../src/app/(app)/reports/product-margin/page.tsx"), "utf8");

test("Product Margin replaces the ten-column phone table with a decision-first operational list", () => {
  assert.match(page, /<Table mobileHidden compactUntil="2xl" aria-label="Product cost and margin estimates">/);
  assert.match(page, /data-product-margin-mobile-list/);
  assert.match(page, /<OperationalList ariaLabel="Product cost and margin estimates" showUntil="2xl">/);
  assert.match(page, /status=\{<Badge variant=\{statusVariant\[row\.status\]\}/);
  assert.match(page, /Margin unavailable/);
  assert.match(page, /Price \{row\.selling_price == null \? "unavailable"/);
  assert.match(page, /Cost \{row\.estimated_product_cost == null \? "incomplete"/);
});

test("Product Margin keeps primary filters visible and moves secondary dimensions into More filters", () => {
  assert.match(page, /<FilterBar resultCount=\{rows\.length\}/);
  assert.match(page, /<Input name="search"/);
  assert.match(page, /<SelectControl name="status"/);
  assert.match(page, /<FilterBarMore activeCount=/);
  assert.match(page, /<SelectControl name="margin_band"/);
  assert.match(page, /<SelectControl name="incomplete"/);
  assert.doesNotMatch(page, /className="sb-list-filters"/);
});
