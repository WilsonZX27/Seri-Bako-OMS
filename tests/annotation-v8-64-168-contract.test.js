const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("Outlet Daily date owns a readable sortable sticky band", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  const query = read("src/server/queries/outlet-daily-records.ts");
  assert.match(page, /stickyColumn="second"/);
  assert.match(page, /SortableHead label="Date"/);
  assert.match(page, /SortableHead label="Outlet"/);
  assert.match(page, /SortableHead label="Last Updated"/);
  assert.match(query, /sortColumns = \{ date: "record_date", outlet: "status", updated: "updated_at" \}/);
});

test("Outlet status and missing sent state have deliberate semantics", () => {
  const badge = read("src/components/ui/status-badge.tsx");
  const css = read("src/app/design-system-v2.css");
  assert.match(badge, /"evening_completed"/);
  assert.match(css, /data-status="missing"/);
});

test("Wastage detail controls cannot create a horizontal blank canvas", () => {
  const form = read("src/components/outlet-daily-record-form.tsx");
  const css = read("src/app/design-system-v2.css");
  assert.match(form, /grid-cols-\[7\.5rem_minmax\(0,1fr\)\]/);
  assert.match(css, /\[data-outlet-daily-lines\][\s\S]*contain: inline-size/);
});

test("PR line UOM is controlled and attachment label starts empty", () => {
  const dialog = read("src/components/add-purchase-request-line-dialog.tsx");
  const page = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  assert.match(dialog, /<SelectNative name="uom"/);
  assert.match(dialog, /uomOptionsForValues/);
  assert.doesNotMatch(page, /defaultLabel="Purchase Request Attachment"/);
});

test("Stock Balance supplier group uses the shared muted surface", () => {
  const workspace = read("src/components/stock-balance-workspace.tsx");
  assert.match(workspace, /bg-\[var\(--sb-surface-muted\)\]/);
  assert.doesNotMatch(workspace, /isCreateBranch \? <p className="[^"]*bg-white/);
});
