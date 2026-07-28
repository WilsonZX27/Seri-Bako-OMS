const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const operations = read("src/lib/validations/stock-operations.ts");
const transaction = read("src/lib/validations/stock-transaction.ts");
const recipe = read("src/lib/validations/recipe.ts");
const recipeActions = read("src/server/actions/recipes.ts");
const procurementActions = read("src/server/actions/procurement.ts");
const productionJob = read("src/lib/validations/production-job.ts");
const productionActions = read("src/server/actions/production-jobs.ts");
const goodsReceivingActions = read("src/server/actions/goods-receivings.ts");
const purchaseReturnActions = read("src/server/actions/purchase-returns.ts");

test("operational inventory forms enforce ISO dates and bounded payloads", () => {
  assert.match(operations, /const operationalDate = z\.iso\.date/);
  assert.match(operations, /max\(1_000_000, "Quantity is too large\."\)/);
  assert.match(operations, /max\(2_000, "Remarks must be 2,000 characters or fewer\."\)/);
  assert.match(operations, /A transfer is limited to 500 lines/);
  assert.match(operations, /A wastage record is limited to 500 lines/);
  assert.match(transaction, /transaction_date: z\.iso\.date/);
  assert.match(transaction, /MAX_TRANSACTION_QUANTITY/);
  assert.match(transaction, /MAX_TRANSACTION_UNIT_COST/);
});

test("recipe input and workflow actions validate identifiers, dates and business ceilings", () => {
  assert.match(recipe, /ingredient_item_id: z\.string\(\)\.uuid/);
  assert.match(recipe, /product_id: z\.string\(\)\.uuid/);
  assert.match(recipe, /effective_date: z\.iso\.date/);
  assert.match(recipe, /wastage_percent: z\.coerce\.number\(\)\.min\(0.*\.max\(100/);
  assert.match(recipe, /MAX_RECIPE_QUANTITY/);
  assert.match(recipeActions, /function parseRecipeId\(id: string\)/);
  assert.match(recipeActions, /const recipeId = parseRecipeId\(id\)/);
  assert.match(recipeActions, /Rejection remarks must be 1,000 characters or fewer/);
});

test("procurement state transitions validate route identifiers and bounded rejection data", () => {
  assert.match(procurementActions, /function parsePurchaseRequestId\(id: string\)/);
  assert.match(procurementActions, /function parsePurchaseOrderId\(id: string\)/);
  assert.match(procurementActions, /const requestId = parsePurchaseRequestId\(id\)/);
  assert.match(procurementActions, /const purchaseOrderId = parsePurchaseOrderId\(id\)/);
  assert.match(procurementActions, /Rejection remarks must be 1,000 characters or fewer/);
  assert.match(procurementActions, /AutoCount PO Number must be 160 characters or fewer/);
});

test("production jobs validate operational values and route identifiers before atomic workflows", () => {
  assert.match(productionJob, /production_date: z\.iso\.date/);
  assert.match(productionJob, /branch_id: z\.string\(\)\.uuid/);
  assert.match(productionJob, /planned_output_qty: z\.coerce\.number\(\)\.positive[\s\S]*\.max\(1_000_000\)/);
  assert.match(productionJob, /remarks: z\.string\(\)\.trim\(\)\.max\(2_000\)/);
  assert.match(productionActions, /function parseProductionJobId\(id: string\)/);
  assert.match(productionActions, /const productionJobId = parseProductionJobId\(id\)/);
  assert.match(productionActions, /z\.string\(\)\.trim\(\)\.min\(1\)\.max\(1_000\)\.parse\(remarks\)/);
});

test("goods receiving and purchase returns use bounded line data and validated workflow identifiers", () => {
  assert.match(operations, /A wastage record is limited to 500 lines/);
  const procurementSchema = read("src/lib/validations/procurement.ts");
  assert.match(procurementSchema, /received_date: requiredIsoDate/);
  assert.match(procurementSchema, /A GRN is limited to 500 lines\./);
  assert.match(procurementSchema, /return_date: requiredIsoDate/);
  assert.match(procurementSchema, /A purchase return is limited to 500 lines\./);
  assert.match(goodsReceivingActions, /function parseGoodsReceivingId\(id: string\)/);
  assert.match(goodsReceivingActions, /const goodsReceivingId = parseGoodsReceivingId\(id\)/);
  assert.match(goodsReceivingActions, /\.eq\("company_id", actor\.companyId\)/);
  assert.match(goodsReceivingActions, /z\.string\(\)\.trim\(\)\.max\(1_000\)\.nullable\(\)\.parse\(cleanText/);
  assert.match(purchaseReturnActions, /function parsePurchaseReturnId\(id: string\)/);
  assert.match(purchaseReturnActions, /const purchaseReturnId = parsePurchaseReturnId\(id\)/);
});
