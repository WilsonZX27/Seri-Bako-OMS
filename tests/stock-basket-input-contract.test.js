const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("stock-basket PR creation validates the complete JSON payload before database access", () => {
  const source = fs.readFileSync("src/server/actions/procurement.ts", "utf8");

  assert.match(source, /stockBasketGroupsSchema/);
  assert.match(source, /stockBasketLineSchema/);
  assert.match(source, /\.max\(20/);
  assert.match(source, /\.max\(100/);
  assert.match(source, /lineCount > 500/);
  assert.match(source, /raw\.length > 100_000/);
  assert.match(source, /parseStockBasketGroups\(formData\.get\("supplier_groups"\)\)/);
  assert.match(source, /basketIdempotencyKey = z\.uuid\(\)\.parse\(cleanText\(formData\.get\("idempotency_key"\)\)\)/);
  assert.match(source, /stockBasketGroupIdempotencyKey\(basketIdempotencyKey, groupIndex\)/);
  assert.doesNotMatch(source, /createPurchaseRequestAggregate\(payload, profile, crypto\.randomUUID\(\), "draft"\)/);
  assert.doesNotMatch(source, /const groups = JSON\.parse\(String\(formData\.get\("supplier_groups"\)/);
});

test("stock basket validates sourced lines before creating drafts and preserves unmapped lines for Purchasing", () => {
  const action = fs.readFileSync("src/server/actions/procurement.ts", "utf8");
  assert.match(action, /const sourcedLines = allLines\.filter/);
  assert.match(action, /Promise\.all\(\[[\s\S]*ensureActiveItems[\s\S]*ensureBranchSupplierSelections\(branchId, sourcedLines, true\)[\s\S]*identity\(\)/);
  assert.match(action, /Purchasing supplier mapping required/);
  const validationIndex = action.indexOf("ensureBranchSupplierSelections(branchId, sourcedLines, true)");
  const creationIndex = action.indexOf("const created: Array", validationIndex);
  assert.ok(validationIndex > -1 && creationIndex > validationIndex);
});
