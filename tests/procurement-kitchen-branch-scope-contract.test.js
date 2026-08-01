const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Kitchen branch selector should query only actor-assigned branches on PR create page", () => {
  const page = read("src/app/(app)/purchase-requests/new/page.tsx");
  const queries = read("src/server/queries/common.ts");

  assert.match(page, /getBranchesForSelect\(true\)/);
  assert.match(page, /params\.branch_id && branches\.some\(\(branch\) => branch\.id === params\.branch_id\)/);
  assert.match(queries, /export const getBranchesForSelect = cache\(async function getBranchesForSelect\(restrictToActorScope = false\) \{/);
  assert.match(queries, /if \(restrictToActorScope\) \{/);
});

test("Kitchen branch scope is enforced in creation and submit transition action paths", () => {
  const source = read("src/server/actions/procurement.ts");

  assert.match(source, /async function ensureActorCanUsePurchaseRequestBranch\(branchId: string \| null\)/);
  assert.match(source, /if \(scope\.companyWideAccess\) return;/);
  assert.match(source, /if \(!scope\.branchIds\.includes\(branchId\)\) \{/);
  assert.match(source, /\"You can only create or submit purchase requests for branches assigned to you\."/);
  assert.match(source, /await ensureActorCanUsePurchaseRequestBranch\(payload\.branch_id\);/);
  assert.match(source, /await ensureActorCanUsePurchaseRequestBranch\(branchId\);/);
  assert.match(source, /await ensureActorCanUsePurchaseRequestBranch\(request\.branch_id\);/);
  assert.match(source, /submitPurchaseRequest\(id: string\) \{/);
  assert.match(source, /transitionPurchaseRequest\(id, \"submit\"\)/);
});

test("Purchasing should keep existing PR create/submit capability while scoping logic stays scope-bound", () => {
  const permissions = read("src/server/auth/permissions.ts");
  const source = read("src/server/actions/procurement.ts");

  assert.match(permissions, /purchasing:\s*\[[\s\S]*?\"pr\.create\"[\s\S]*?\"pr\.submit\"/);
  assert.match(source, /if \(scope\.companyWideAccess\) return;/);
  assert.doesNotMatch(source, /if \(scope\.roleCode === \"purchasing\"\)/);
});
