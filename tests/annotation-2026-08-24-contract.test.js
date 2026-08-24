import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("portrait tablet uses the shared contained canvas and two-row query contract", () => {
  const production = read("src/app/(app)/production/jobs/page.tsx");
  const css = read("src/app/design-system-v2.css");
  assert.match(production, /tabletCanvas="contained"/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-column: 1 \/ -1 !important/);
  assert.match(css, /white-space: nowrap/);
});

test("PR list and summary keep optional and six-field information truthful", () => {
  const list = read("src/app/(app)/purchase-requests/page.tsx");
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  assert.match(list, /request\.needed_by_date \?/);
  assert.match(detail, /Request Date[\s\S]*Location[\s\S]*Submitted By[\s\S]*Requested Lines[\s\S]*Est\. Total Cost[\s\S]*Supplier/);
  assert.doesNotMatch(detail, /line-clamp-4/);
  assert.match(detail, /requested_by_name/);
});

test("returned requests can be corrected without silently advancing workflow", () => {
  const action = read("src/server/actions/procurement.ts");
  const migration = read("supabase/migrations/201_allow_rejected_purchase_request_corrections.sql");
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  assert.match(action, /\["draft", "rejected", "returned"\]/);
  assert.match(migration, /request_row\.status::text not in \('draft','rejected','returned'\)/i);
  assert.match(migration, /request_row\.requested_by is distinct from actor\.id/i);
  assert.match(migration, /role_row\.role_code='super_admin'/i);
  assert.match(detail, /profile\?\.id === request\.requested_by \|\| isOwner/);
  assert.match(detail, /AddPurchaseRequestLineDialog/);
  assert.doesNotMatch(detail, /<details[^>]*>[\s\S]*Add request line/i);
});

test("PR read-only items show short actionable states in one presentation", () => {
  const detail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const query = read("src/server/queries/procurement.ts");
  assert.match(detail, /No stock count recorded for this branch yet/);
  assert.doesNotMatch(detail, /Next: Create or update/);
  assert.doesNotMatch(query, /OMS stock ledger/);
  assert.match(detail, /bg-\[var\(--sb-danger-bg\)\]/);
});

test("register and basket presentations enforce the new operational contract", () => {
  const items = read("src/app/(app)/items/page.tsx");
  const basket = read("src/components/stock-balance-workspace.tsx");
  const daily = read("src/app/(app)/outlet-daily-records/page.tsx");
  assert.doesNotMatch(items, />Category</);
  assert.match(basket, /branchConflict/);
  assert.match(basket, /accessibleBranchIds/);
  assert.match(basket, /One branch per PR basket/);
  assert.match(daily, /Qty Sent[\s\S]*Outlet Progress[\s\S]*Received[\s\S]*Wastage[\s\S]*Submitted<br \/>By[\s\S]*Updated/);
  assert.match(daily, /Wastage %/);
  assert.match(daily, /row\.submitted_by_name \?\? "—"/);
});
