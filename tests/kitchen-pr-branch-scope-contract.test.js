const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

const branchesQuery = read("src/server/queries/common.ts");
test("PR new page uses scoped branch options", () => {
  const page = read("src/app/(app)/purchase-requests/new/page.tsx");
  assert.match(page, /getBranchesForSelect\(\{\s*restrictToActorScope:\s*true\s*\}\)/);
  assert.match(page, /selectedBranchId = params\.branch_id && branches\.some\(\(branch\) => branch\.id === params\.branch_id\) \? params\.branch_id : branches\[0\]\?\.id;/);
  assert.match(page, /initialBranchId=\{selectedBranchId\}/);
});

test("Kitchen PR scope is enforced before create and transition", () => {
  assert.match(branchesQuery, /restrictToActorScope/);
  const action = read("src/server/actions/procurement.ts");
  assert.match(action, /scope\.branchIds\.includes\(branchId\)/);
  assert.match(action, /ensureActorCanUsePurchaseRequestBranch\(payload\.branch_id\);/);
  assert.match(action, /ensureActorCanUsePurchaseRequestBranch\(branchId\);/);
  assert.match(action, /ensureActorCanUsePurchaseRequestBranch\(request\.branch_id\);/);
  assert.match(action, /Could not verify branch scope for this purchase request\./);
  assert.match(action, /You can only create or submit purchase requests for branches assigned to you\./);
});

test("Purchasing branch scope remains company-wide while keeping PR create/submit permissions", () => {
  const permissions = read("src/server/auth/permissions.ts");
  assert.match(permissions, /purchasing:\s*\[[\s\S]*"pr\.create"[\s\S]*"pr\.submit"/);
  const dashboard = read("src/server/queries/dashboard.ts");
  assert.match(dashboard, /isPurchasing\s*=\s*role === "purchasing"/);
  assert.match(dashboard, /needsProcurement/);
});
