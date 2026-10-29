const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("dashboard repair actions show one request heading, asset/issue, location, reporter and date", () => {
  const query = read("src", "server", "queries", "pending-actions.ts");
  const page = read("src", "components", "dashboard-workspace.tsx");
  assert.match(query, /\.from\("asset_maintenance"\)[\s\S]*?\.select\("id,asset_id,location_id,description,priority,author_name"\)[\s\S]*?\.in\("id", permittedIds\)/);
  assert.match(query, /locationNames\.get\(maintenanceDetails\.get\(row\.id\)\?\.location_id \?\? ""\) \?\? row\.location/);
  assert.match(query, /if \(assetIds\.length && permissions\["assets\.view"\]\)/);
  assert.match(query, /maintenance_author_name: maintenanceDetails\.get\(row\.id\)\?\.author_name/);
  assert.match(page, /"REPAIR REQUEST"/);
  assert.match(page, /row\.maintenance_asset_name/);
  assert.doesNotMatch(page, /row\.maintenance_description/);
  assert.match(page, /row\.branch_name/);
  assert.match(page, /row\.maintenance_author_name/);
  assert.match(page, /formatDateOnly\(row\.updated_at\)/);
});

test("asset overview and maintenance queues page at ten rows with shared navigation", () => {
  const query = read("src", "server", "queries", "assets.ts");
  const page = read("src", "app", "(app)", "asset-management", "page.tsx");
  assert.match(query, /ASSET_MAINTENANCE_PAGE_SIZE = 10/);
  assert.match(query, /select\("\*", \{ count: "exact" \}\)[\s\S]*?\.range\(\(page - 1\) \* ASSET_MAINTENANCE_PAGE_SIZE, page \* ASSET_MAINTENANCE_PAGE_SIZE - 1\)/);
  assert.match(query, /view === "maintenance" \? ASSET_MAINTENANCE_PAGE_SIZE : 50/);
  assert.match(page, /view === "overview" \|\| view === "maintenance" \? 10 : 50/);
  assert.equal((page.match(/<PaginationControls/g) ?? []).length, 2);
  assert.match(page, /AssetSectionHeading title="Open maintenance requests" value=\{data\.total\}/);
});

test("transfer asset search adds directly to the current request without a GET detour", () => {
  const page = read("src", "app", "(app)", "asset-management", "transfers", "new", "page.tsx");
  const form = read("src", "components", "asset-transfer-batch-form.tsx");
  assert.match(page, /<AssetTransferBatchForm/);assert.doesNotMatch(page, /method="get"|assetTransferPickerHref/);
  assert.match(form, /ariaLabel="Find assets to add"/);assert.match(form, /onSelect={item => setDraft/);
  assert.match(form, /toggleTransferAsset/);
});

test("goods receiving rows follow the PR hierarchy without hiding quantities", () => {
  const page = read("src", "app", "(app)", "goods-receivings", "page.tsx");
  assert.match(page, /primary=\{<DocumentNumber value=\{receiving\.grn_no\} \/>\}/);
  assert.match(page, /secondary=\{<span className="sb-pr-phone-supplier-row"><span className="sb-pr-phone-supplier" title=\{receiving\.supplier_name/);
  for(const icon of ["Store","Package","MapPin","FileText","CalendarDays"])assert.ok(page.includes(`<${icon} aria-hidden="true"`));
  assert.match(page, /formatNumber\(receiving\.received_total\)\} in · \{formatNumber\(receiving\.rejected_total\)\} rejected/);
  assert.match(page, /receiving\.branch_name[\s\S]*?receiving\.po_no[\s\S]*?formatDateOnly\(receiving\.received_date\)/);
});

test("Outlet Daily uses concise pending copy without repeating a confirmation instruction", () => {
  const list = read("src", "app", "(app)", "outlet-daily-records", "page.tsx");
  const detail = read("src", "app", "(app)", "outlet-daily-records", "[id]", "page.tsx");
  assert.match(detail, /Enter received quantities/);
  assert.match(detail, /Use 0 when none\. Save, then complete Wastage, Usage, or Qty Sold\./);
  assert.doesNotMatch(list, /Needs confirmation|Needs entry/);
  assert.doesNotMatch(detail, /Needs confirmation|Needs entry/);
  assert.match(list, /row\.total_sent === null \? "Pending"/);
  assert.match(detail, /record\.total_sent === null \? "Pending"/);
});
