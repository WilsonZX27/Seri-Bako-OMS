const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("draft ownership falls back through updated and created users", () => {
  const source = read("src/server/queries/outlet-daily-records.ts");
  assert.match(source, /record\.submitted_by, record\.updated_by, record\.created_by/);
  assert.match(source, /record\.updated_by \?\? record\.submitted_by \?\? record\.created_by/);
});

test("packaging is excluded from received and wastage analytics", () => {
  const source = read("src/server/queries/outlet-daily-records.ts");
  assert.match(source, /isPackagingCategory/);
  assert.match(source, /operationalLines\.map/);
  assert.match(source, /operationalLines\.reduce/);
  assert.match(source, /operationalProductIds\.has\(line\.product_id\)/);
});

test("Qty Sent confirmation precedes posting", () => {
  const page = read("src/app/(app)/outlet-daily-records/[id]/page.tsx");
  assert.match(page, /outletCanComplete = canEditOutletValues && qtySentConfirmed/);
  assert.match(page, /value="morning_recorded"[^>]*>[\s\S]*Confirm Qty Sent/);
  assert.match(page, /value="draft"[^>]*>[\s\S]*Save Draft/);
});

test("Outlet Daily owns its responsive identity without duplicate location", () => {
  const page = read("src/app/(app)/outlet-daily-records/[id]/page.tsx");
  assert.match(page, /documentIdentity=/);
  assert.match(page, /text-\[14px\][^\"]*sm:whitespace-nowrap[^\"]*sm:text-\[16px\]/);
  assert.doesNotMatch(page, /branch=\{record\.branch_name\}/);
});

test("Today rail has explicit operational hierarchy", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  for (const label of ["Records", "Qty sent", "Dispatch", "Total received", "Receiving", "Posted", "In progress"]) assert.match(page, new RegExp(label));
  assert.match(page, /<ConsoleSection title="Today"><dl/);
  assert.doesNotMatch(page, /ConsoleSection title="Completion"/);
});

test("Qty Sent validation does not append a paragraph of workflow copy", () => {
  const source = read("src/server/actions/error-handling.ts");
  assert.doesNotMatch(source, /You can still enter Received and Wastage/);
  assert.match(source, /Enter Qty Sent before confirming this record/);
});
