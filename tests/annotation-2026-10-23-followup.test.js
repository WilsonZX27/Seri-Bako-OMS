import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("workspace updates do not repeat repair requests already in the pending queue", () => {
  const query = read("src/server/queries/topbar.ts");
  const menu = read("src/components/layout/top-bar-activity-menu.tsx");
  assert.match(query, /filter\(\(row\) => !pendingActionHrefs\.has\(row\.action_url \?\? ""\)\)/);
  assert.match(menu, /repair\.maintenance_asset_name/);
  assert.doesNotMatch(menu, /repair\.maintenance_description/);
  assert.match(menu, /repair\.branch_name/);
  assert.match(menu, /repair\.maintenance_priority/);
});

test("Google Script branch aliases display through the OMS branch catalogue", () => {
  const importer = read("scripts/assets/build-import.py");
  const query = read("src/server/queries/assets.ts");
  const pending = read("src/server/queries/pending-actions.ts");
  assert.match(importer, /'PNG - ALMA \(Central Kitchen\)': 'CK-ALMA'/);
  assert.match(importer, /'KL - PJS10 \(Central Kitchen\)': 'CK-PJS10'/);
  assert.match(query, /display_name: assetLocationDisplayName\(row, names\)/);
  assert.match(pending, /assetLocationDisplayName\(row, branchNames\)/);
  assert.match(query, /source_name: string; display_name\?: string/);
});

test("transfer picker uses one shared search action and PR-style request/list sections", () => {
  const page = read("src/app/(app)/asset-management/transfers/new/page.tsx");
  const header = read("src/components/common/UnifiedListHeader.tsx");
  const schema = read("supabase/migrations/337_asset_management_foundation.sql");
  assert.match(page, /<FilterBar[^>]*>[\s\S]*<Input type="search" name="q"/);
  assert.equal((page.match(/type="submit"/g) ?? []).length, 1);
  assert.match(page, /<form method="get"[\s\S]*?<Button type="submit">Load assets<\/Button>/);
  assert.match(page, /if \(batchOptions\) return/);
  assert.doesNotMatch(page, /<Button[^>]*Search/);
  assert.match(header, /\\b\(search\|filter\)\\b/i);
  assert.match(page, /Request details/);
  assert.match(page, /Assets list/);
  assert.match(schema, /asset_id uuid not null/);
  assert.doesNotMatch(page, /type="checkbox"|multiple/);
});

test("daily record compact rows emphasize Today and show four concise last-updater metrics", () => {
  const page = read("src/app/(app)/outlet-daily-records/page.tsx");
  const query = read("src/server/queries/outlet-daily-records.ts");
  const css = read("src/app/design-system-v2.css");
  assert.match(page, /font-semibold text-\[var\(--sb-success-strong\)\].*Today/);
  assert.match(page, /Last updated by/);
  assert.match(page, /row\.updated_by_name/);
  assert.match(page, /receivedDisplay\(row\)\.value === "Pending"/);
  assert.match(page, /compactWastageDisplay\(row\)\.value === "Not final"/);
  assert.match(query, /submitted_by_name: record\.submitted_by \? actorDisplayName\(actorDisplayMap, record\.submitted_by\) : null/);
  assert.match(css, /\.sb-daily-record-metrics \{\s*display: grid; grid-template-columns: repeat\(4/);
});

test("goods receiving compact list uses the shared alternating compact-row treatment", () => {
  const css = read("src/app/design-system-v2.css");
  const page = read("src/app/(app)/goods-receivings/page.tsx");
  assert.match(page, /className="sb-goods-receiving-rows"/);
  assert.match(page, /primary=\{<DocumentNumber/);
  assert.match(page, /secondary=\{<span/);
  assert.match(page, /detail=\{<span/);
  assert.match(css, /\.sb-goods-receiving-rows > \[role="listitem"\]:nth-child\(even\) \{ background: #edf2ef; \}/);
});
