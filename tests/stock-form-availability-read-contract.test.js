const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const inventory = fs.readFileSync("src/server/queries/inventory.ts", "utf8");
const operations = fs.readFileSync("src/server/queries/stock-operations.ts", "utf8");
const production = fs.readFileSync("src/server/queries/production-jobs.ts", "utf8");
const newProductionPage = fs.readFileSync("src/app/(app)/production/jobs/new/page.tsx", "utf8");

test("inventory forms use the lightweight availability projection", () => {
  const helper = inventory.slice(
    inventory.indexOf("export async function getStockAvailabilityOptions"),
    inventory.indexOf("export async function getStockBalanceSummary"),
  );
  assert.match(helper, /select\("branch_id,item_id,item_code,item_name,base_unit,current_qty"\)/);
  assert.match(helper, /if \(input\.branchId\) query = query\.eq\("branch_id", input\.branchId\)/);
  assert.match(helper, /if \(itemIds\.length\) query = query\.in\("item_id", itemIds\)/);
  assert.doesNotMatch(helper, /supplier_items|branch_supplier_items|item_image_url/);
});

test("stock operation forms scope availability to the selected source branch", () => {
  const seed = operations.slice(operations.indexOf("export async function getOperationSeedLines"));
  assert.match(seed, /if \(!branchId\) return \[\]/);
  assert.match(seed, /getStockAvailabilityOptions\(\{ branchId \}\)/);
  assert.doesNotMatch(seed, /getStockBalanceDetails/);
});

test("production creation transfers balances only for recipe ingredients after permission", () => {
  const options = production.slice(
    production.indexOf("export async function getProductionJobFormOptions"),
    production.indexOf("export async function getActiveProductionRecipes"),
  );
  assert.match(options, /recipes\.flatMap\(\(recipe\) => recipe\.lines\.map\(\(line\) => line\.item_id\)\)/);
  assert.match(options, /getStockAvailabilityOptions\(\{ itemIds: ingredientItemIds \}\)/);
  assert.doesNotMatch(options, /getStockBalanceDetails/);
  assert.match(newProductionPage, /const options = allowed \? await getProductionJobFormOptions\(\)/);
});
