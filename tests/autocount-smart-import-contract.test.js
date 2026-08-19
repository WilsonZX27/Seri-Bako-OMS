const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
function loadAnalyzer() {
  const source = read("src/lib/imports/autocount.ts");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const runtime = { exports: {} };
  const execute = new Function("exports", "require", "module", "__filename", "__dirname", compiled);
  execute(runtime.exports, require, runtime, path.join(root, "src/lib/imports/autocount.ts"), path.join(root, "src/lib/imports"));
  return runtime.exports;
}

test("AutoCount import has one direct multi-file workspace without changing supplier items page", () => {
  const page = read("src/app/(app)/imports/autocount/page.tsx");
  const workflow = read("src/components/imports/autocount-import-workflow.tsx");
  assert.match(page, /AutoCount Direct Import/);
  assert.match(workflow, /multiple/);
  assert.match(workflow, /No OMS template is required/);
  assert.match(workflow, /Confirm once/);
});

test("AutoCount file profiles are detected from headers rather than filenames", () => {
  const parser = read("src/lib/imports/autocount.ts");
  assert.match(parser, /code.*company name.*currency code/s);
  assert.match(parser, /item code.*base uom.*main supplier.*item group/s);
  assert.match(parser, /item code.*location.*uom.*qty.*total cost/s);
});

test("AutoCount application is atomic, tenant-scoped, permission checked, and inventory silent", () => {
  const migration = read("supabase/migrations/169_autocount_smart_import.sql");
  assert.match(migration, /create or replace function public\.apply_autocount_import_job/);
  assert.match(migration, /security definer/);
  assert.match(migration, /current_staff_company_id\(\)/);
  assert.match(migration, /has_permission\('imports\.create'\)/);
  assert.match(migration, /'inventoryMovementsCreated', 0/);
  assert.doesNotMatch(migration, /insert into public\.stock_transactions/i);
  assert.doesNotMatch(migration, /insert into public\.stock_transaction_lines/i);
});

test("Supplier operational codes retain one-to-many AutoCount creditor references", () => {
  const migration = read("supabase/migrations/169_autocount_smart_import.sql");
  const analyzer = read("src/lib/imports/autocount.ts");
  assert.match(migration, /create table public\.supplier_external_references/);
  assert.match(migration, /unique \(company_id, source_system, external_code\)/);
  assert.match(analyzer, /supplier_code: group/);
  assert.match(analyzer, /external_refs/);
});

test("Preview stages normalized rows and confirmation trusts only the job id", () => {
  const preview = read("src/app/api/imports/autocount/preview/route.ts");
  const confirm = read("src/app/api/imports/autocount/confirm/route.ts");
  assert.match(preview, /autocount_import_rows/);
  assert.match(preview, /rejectCrossSiteMutation/);
  assert.match(confirm, /jobId: z\.string\(\)\.uuid\(\)/);
  assert.match(confirm, /apply_autocount_import_job/);
  assert.match(confirm, /rejectCrossSiteMutation/);
});

test("sanitized latest-file fixture joins suppliers, items, and branch mappings without inventory movement", () => {
  const { analyzeAutoCountFiles } = loadAnalyzer();
  const files = JSON.parse(read("tests/fixtures/autocount-sanitized.json"));
  const analysis = analyzeAutoCountFiles(files, ["CK-PNG", "CK-PJS10"]);
  assert.deepEqual(analysis.blockingIssues, []);
  assert.equal(analysis.summary.suppliers, 2);
  assert.equal(analysis.summary.items, 3);
  assert.equal(analysis.summary.branchMappings, 3);
  assert.equal(analysis.summary.inventoryMovements, 0);
  const pasar = analysis.rows.find((row) => row.entityType === "supplier" && row.businessKey === "PASAR");
  assert.equal(pasar.normalized.supplier_name, "PASAR");
  assert.equal(pasar.normalized.external_refs.length, 2);
});

test("unknown branch and location item missing from Item List fail closed", () => {
  const { analyzeAutoCountFiles } = loadAnalyzer();
  const files = JSON.parse(read("tests/fixtures/autocount-sanitized.json"));
  files[2].rows.push({ "Item Code": "MISSING00001", "Location": "UNKNOWN", "UOM": "KG", "Qty": "1", "Total Cost": "1" });
  const analysis = analyzeAutoCountFiles(files, ["CK-PNG"]);
  assert.ok(analysis.blockingIssues.some((issue) => issue.includes("missing from the Item List")));
});
