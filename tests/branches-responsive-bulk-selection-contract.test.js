const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Branches replaces the narrow technical table without losing bulk selection", () => {
  const branches = read("src/app/(app)/branches/page.tsx");

  assert.match(branches, /<Table mobileHidden compactUntil="xl" aria-label="Branches"/);
  assert.match(branches, /<OperationalList className="sb-inventory-list-surface" ariaLabel="Branches" showUntil="xl">/);
  assert.match(branches, /<BulkSelectAllCheckbox touchTarget \/>/);
  assert.match(branches, /<BulkSelectRowCheckbox id=\{branch\.id\} label=\{`Select \$\{branch\.branch_name\}`\} touchTarget \/>/);
  assert.match(branches, /branch\.phone \?\? "No phone"/);
  assert.match(branches, /branch\.email \?\? "No email"/);
  assert.match(branches, /branch\.address \?\? "No address"/);
  assert.match(branches, /branch\.branch_type\.replaceAll\("_", " "\)/);
  assert.doesNotMatch(branches, /\{canManage \? <TableSelection/);
});

test("mobile bulk checkboxes have a real 44px hit target and unique row names", () => {
  const bulk = read("src/components/bulk-selection.tsx");

  assert.match(bulk, /BulkSelectAllCheckbox\(\{ touchTarget = false \}/);
  assert.match(bulk, /BulkSelectRowCheckbox\(\{ id, label = "Select row", touchTarget = false \}/);
  assert.match(bulk, /aria-label=\{label\}/);
  assert.match(bulk, /<label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">/);
});
