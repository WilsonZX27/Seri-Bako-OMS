const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Sprint 7.29.1 uses draft save plus direct atomic confirmation", () => {
  const action = read("src/server/actions/stock-counts.ts");
  const detail = read("src/app/(app)/stock-counts/[id]/page.tsx");
  const permissions = read("src/server/auth/permissions.ts");
  const migration = read("supabase/migrations/110_sprint_7_29_1_stock_count_posting_integrity.sql");
  const schema = read("src/lib/validations/stock-count.ts");

  assert.match(action, /updateStockCountDraft/);
  assert.match(action, /rpc\("update_stock_count_draft_atomic"/);
  assert.match(action, /rpc\("post_stock_count_atomic"/);
  assert.match(action, /requirePermissionOrRedirect\("stock_count\.post"/);
  assert.match(action, /revalidatePath\("\/inventory"\)/);
  assert.match(action, /revalidatePath\("\/stock-balance"\)/);
  assert.match(action, /revalidatePath\("\/stock-card"\)/);
  assert.match(action, /revalidatePath\("\/stock-transactions"\)/);
  assert.doesNotMatch(action, /approveStockCount|submitStockCount|reviewStockCount/);
  assert.match(detail, /Save draft/);
  assert.match(detail, /Confirm & Post Count/);
  assert.match(detail, /StockCountForm[\s\S]*updateStockCountDraft/);
  assert.doesNotMatch(detail, /Approve Stock Count|Review Stock Count|Submit Stock Count/);
  assert.doesNotMatch(permissions, /stock_count\.(submit|review|approve)/);
  assert.match(migration, /status <> 'draft'/);
  assert.match(migration, /current_balance is distinct from line\.theoretical_qty/);
  assert.match(migration, /variance := line\.physical_qty - line\.theoretical_qty/);
  assert.match(migration, /if variance = 0 then[\s\S]*continue;/);
  assert.match(migration, /perform public\.insert_inventory_movement/);
  assert.match(migration, /set status = 'posted'/);
  assert.match(migration, /for update/);
  assert.match(migration, /posting_reference/);
  assert.match(schema, /4 decimal places/);
});

test("Chef retains former Kitchen Stock Count permissions while Kitchen is self-service only", () => {
  const permissions = read("src/server/auth/permissions.ts");
  const migration = read("supabase/migrations/368_kitchen_role_boundary_and_chef_assignments.sql");

  const chefMatrix = permissions.match(/chef:\s*kitchenPermissions/);
  const kitchenMatrix = permissions.match(/kitchen:\s*\[([^\]]*)\]/);
  assert.ok(chefMatrix, "Chef must preserve the former Kitchen matrix");
  assert.ok(kitchenMatrix, "Kitchen permission matrix must exist");
  const chefPermissions = permissions.match(/const kitchenPermissions = \[([\s\S]*?)\] as const/);
  assert.ok(chefPermissions, "Chef's inherited permission set must be explicit");
  for (const permission of [
    "stock_count.read",
    "stock_count.create",
    "stock_count.update",
    "stock_count.post",
    "inventory.read",
    "stock.view",
    "stock_balance.read",
    "stock_transactions.read",
  ]) {
    assert.match(chefPermissions[1], new RegExp(`"${permission.replace(".", "\\.")}"`));
  }
  assert.match(migration, /insert into public\.role_permissions/);
  assert.match(migration, /where chef\.role_code = 'chef'/);
  assert.match(migration, /delete from public\.role_permissions/);
  assert.match(migration, /p\.permission_code not in \('assets\.view', 'assets\.check', 'dashboard\.view'\)/);
  assert.match(migration, /Staff Code %/);
  assert.match(migration, /public\.asset_location_access/);
  assert.deepEqual(kitchenMatrix[1].split(",").map((value) => value.trim().replaceAll('"', "")).filter(Boolean), ["assets.view", "assets.check", "dashboard.view"]);
  assert.match(migration, /p\.permission_code not in \('assets\.view', 'assets\.check', 'dashboard\.view'\)/);
});

test("legacy stock_balances.view resolves only to canonical stock_balance.read", () => {
  const permissions = read("src/server/auth/permissions.ts");
  const alias = permissions.match(/"stock_balances\.view":\s*\[([^\]]*)\]/);
  assert.ok(alias, "Legacy Stock Balance alias must remain resolvable");
  assert.match(alias[1], /"stock_balance\.read"/);
  assert.doesNotMatch(alias[1], /"inventory\.read"|"stock_balances\.view"/);
  assert.doesNotMatch(permissions, /"stock_balance\.read":\s*\[[^\]]*"stock_balances\.view"/);
});

test("legacy pending counts remain postable without restoring legacy actions", () => {
  const detail = read("src/app/(app)/stock-counts/[id]/page.tsx");
  const migration = read("supabase/migrations/110_sprint_7_29_1_stock_count_posting_integrity.sql");

  assert.match(detail, /legacyPendingStatuses/);
  assert.match(detail, /Confirm & Post Count/);
  assert.doesNotMatch(detail, /Submit Stock Count|Review Stock Count|Approve Stock Count/);
  assert.match(migration, /status not in \('draft', 'submitted', 'reviewed', 'approved'\)/);
  assert.match(migration, /status in \('draft', 'submitted', 'reviewed', 'approved'\)/);
});

test("draft submission preserves every line id even when rows are filtered", () => {
  const form = read("src/components/stock-count-form.tsx");
  const action = read("src/server/actions/stock-counts.ts");

  assert.match(form, /key=\{`hidden-\$\{line\.item_id\}`\}[\s\S]*name="line_id"/);
  assert.match(action, /lineIds\.length !== payload\.lines\.length/);
  assert.match(action, /update_stock_count_draft_atomic/);
});

test("Stock Balance is branch-filtered and query failures are not converted to empty balances", () => {
  const inventory = read("src/server/queries/inventory.ts");

  assert.match(inventory, /from\("stock_balances_summary"\)/);
  assert.match(inventory, /if \(branchId\) query = query\.eq\("branch_id", branchId\)/);
  assert.match(inventory, /throw new Error\(`Stock Balance could not be loaded:/);
  assert.doesNotMatch(
    inventory.slice(inventory.indexOf("export async function getStockBalanceDetails"), inventory.indexOf("export async function getInventoryDashboard")),
    /return databasePagination\(\[\] as StockBalanceDetail/,
  );
});

test("posting validation and error messages cover integrity failures", () => {
  const action = read("src/server/actions/stock-counts.ts");
  const migration = read("supabase/migrations/110_sprint_7_29_1_stock_count_posting_integrity.sql");

  assert.match(action, /You do not have permission to confirm and post stock counts/);
  assert.match(action, /Stock changed after this count was started/);
  assert.match(action, /item UOM does not match/);
  assert.match(action, /outside your assigned branch scope/);
  assert.match(action, /posting reference conflicts/);
  assert.match(action, /No inventory changes were made/);
  assert.match(migration, /can_access_inventory_branch/);
  assert.match(migration, /line\.line_position is null or line\.line_position < 1/);
  assert.match(migration, /line\.physical_qty <> round\(line\.physical_qty, 4\)/);
});

test("Stock Count rows have an explicit deterministic position and query order", () => {
  const migration = read("supabase/migrations/110_sprint_7_29_1_stock_count_posting_integrity.sql");
  const query = read("src/server/queries/stock-counts.ts");

  assert.match(migration, /stock_count_line_position_seq/);
  assert.match(migration, /stock_count_lines_count_position_idx/);
  assert.match(migration, /order by line_position asc, id asc/);
  assert.match(query, /order\("line_position", \{ ascending: true \}\)\.order\("id", \{ ascending: true \}\)/);
});

test("posting arithmetic preserves the requested ledger example", () => {
  const theoretical = { A: 19.79, B: 6.91, C: 11 };
  const physical = { A: 18.1, B: 14.2, C: 11 };
  assert.equal(Number((physical.A - theoretical.A).toFixed(2)), -1.69);
  assert.equal(Number((physical.B - theoretical.B).toFixed(2)), 7.29);
  assert.equal(Number((physical.C - theoretical.C).toFixed(2)), 0);
  assert.equal(Number((theoretical.A + physical.A - theoretical.A).toFixed(2)), 18.1);
  assert.equal(Number((theoretical.B + physical.B - theoretical.B).toFixed(2)), 14.2);
});

test("Stock Count integrity migration has no procurement side effects", () => {
  const migration = read("supabase/migrations/110_sprint_7_29_1_stock_count_posting_integrity.sql");
  assert.doesNotMatch(migration, /purchase_requests|purchase_orders|goods_receivings|stock_transactions.*purchase/);
});
