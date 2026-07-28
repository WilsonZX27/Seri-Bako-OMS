const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const items = read("src/server/actions/items.ts");
const products = read("src/server/actions/products.ts");
const images = read("src/server/storage/master-data-image.ts");
const suppliers = read("src/server/actions/suppliers.ts");
const masterData = read("src/server/actions/master-data.ts");
const supplierSchema = read("src/lib/validations/supplier.ts");
const masterDataSchema = read("src/lib/validations/master-data.ts");

test("item mutations validate identifiers and scope every write to the active tenant", () => {
  assert.match(items, /function parseItemId\(id: string\)/);
  assert.match(items, /const itemId = parseItemId\(id\)/);
  assert.match(items, /await requireActiveTenantActor\(\)/);
  assert.match(items, /\.eq\("company_id", actor\.companyId\)/);
});

test("product and packaging mutations validate identifiers, bounds and tenant scope", () => {
  assert.match(products, /function parseProductId\(id: string\)/);
  assert.match(products, /const packagingSchema = z\.object/);
  assert.match(products, /product_id: z\.string\(\)\.uuid/);
  assert.match(products, /validatedPackagingId/);
  assert.match(products, /\.eq\("company_id", actor\.companyId\)/);
});

test("master-data image storage cannot construct a path from an unvalidated record ID", () => {
  assert.match(images, /const recordId = z\.string\(\)\.uuid/);
  assert.match(images, /\$\{entity\}\/\$\{recordId\}\/image/);
  assert.doesNotMatch(images, /\$\{entity\}\/\$\{id\}\/image/);
});

test("supplier and conversion mutations validate UUID targets before tenant-scoped writes", () => {
  assert.match(suppliers, /function parseSupplierId\(id: string\)/);
  assert.match(suppliers, /const supplierId = parseSupplierId\(id\)/);
  assert.match(suppliers, /\.eq\("id", supplierId\)\s*\.eq\("company_id", actor\.companyId\)/);
  assert.match(masterData, /function parseRecordId\(id: string\)/);
  assert.match(masterData, /const supplierItemId = parseRecordId\(id\)/);
  assert.match(masterData, /const conversionId = parseRecordId\(id\)/);
  assert.match(masterData, /\.eq\("company_id", actor\.companyId\)/);
});

test("supplier and master-data schemas impose operational payload limits", () => {
  assert.match(supplierSchema, /name: z\.string\(\)\.trim\(\)\.min\(1, "Supplier name is required"\)\.max\(160\)/);
  assert.match(supplierSchema, /address: z\.string\(\)\.trim\(\)\.max\(2_000\)/);
  assert.match(masterDataSchema, /supplier_item_name: z\.string\(\)\.trim\(\)\.min\(1, "Supplier item name is required"\)\.max\(160\)/);
  assert.match(masterDataSchema, /lead_time_days: z\.coerce\.number\(\)\.int\(\)\.min\(0\)\.max\(3_650\)/);
  assert.match(masterDataSchema, /valid_from: z\.iso\.date\(\)/);
});
