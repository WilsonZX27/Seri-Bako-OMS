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

test("AutoCount Confirm creates supplier-item sourcing before validating branch mappings", () => {
  const repair = read("supabase/migrations/171_fix_autocount_import_confirm.sql");
  const itemLoop = repair.slice(repair.indexOf("entity_type = 'item'"), repair.indexOf("entity_type = 'branch_mapping'"));
  const branchLoop = repair.slice(repair.indexOf("entity_type = 'branch_mapping'"), repair.indexOf("entity_type = 'uom_conversion'"));
  assert.match(itemLoop, /if target_supplier_item\.id is null then[\s\S]*insert into public\.supplier_items/);
  assert.doesNotMatch(itemLoop, /target_branch\.id/);
  assert.match(branchLoop, /if target_branch\.id is null then raise exception 'Staged branch/);
  assert.match(branchLoop, /if target_supplier_item\.id is null then raise exception 'Supplier item relationship/);
  assert.match(repair, /'inventoryMovementsCreated', 0/);
  assert.doesNotMatch(repair, /insert into public\.stock_transactions/i);
});

test("AutoCount identity recovery is exact, staged, and preserves the original item id", () => {
  const recovery = read("supabase/migrations/172_recover_staged_autocount_item_identity.sql");
  assert.match(recovery, /job\.status = 'ready'/);
  assert.match(recovery, /job\.id = '620fbc6a-0ad1-4f26-aa43-d38987251d8b'::uuid/);
  assert.match(recovery, /staged\.entity_type = 'item'/);
  assert.match(recovery, /item\.deleted_at is not null/);
  assert.match(recovery, /supplier_item\.status = 'active'/);
  assert.match(recovery, /item_name[\s\S]*base_uom[\s\S]*base_unit/);
  assert.match(recovery, /not exists \([\s\S]*live_item\.deleted_at is null/);
  assert.match(recovery, /update public\.items item[\s\S]*set deleted_at = null/);
  assert.doesNotMatch(recovery, /insert into public\.items/);
});

test("duplicate suppliers merge recoverably and receive a live normalized-name guard", () => {
  const migration = read("supabase/migrations/173_merge_duplicate_supplier_identities.sql");
  assert.match(migration, /create table if not exists public\.supplier_merge_audit/);
  assert.match(migration, /canonical_before jsonb not null/);
  assert.match(migration, /merged_before jsonb not null/);
  assert.match(migration, /update public\.purchase_request_lines set suggested_supplier_id = canonical_supplier\.id/);
  assert.match(migration, /update public\.purchase_orders set supplier_id = canonical_supplier\.id/);
  assert.match(migration, /update public\.supplier_items[\s\S]*set status = 'inactive', deleted_at = now\(\)/);
  assert.match(migration, /suppliers_company_normalized_name_active_idx/);
  assert.doesNotMatch(migration, /delete from public\.suppliers/);
});

test("Supplier operational codes retain one-to-many AutoCount creditor references", () => {
  const migration = read("supabase/migrations/169_autocount_smart_import.sql");
  const analyzer = read("src/lib/imports/autocount.ts");
  assert.match(migration, /create table public\.supplier_external_references/);
  assert.match(migration, /unique \(company_id, source_system, external_code\)/);
  assert.match(analyzer, /supplier_code: internalCode/);
  assert.match(analyzer, /supplier_group: group/);
  assert.match(analyzer, /external_refs/);
});

test("Supplier display identity separates Item Group from internal AutoCount code", () => {
  const migration = read("supabase/migrations/174_supplier_code_display_group.sql");
  const suppliers = read("src/app/(app)/suppliers/page.tsx");
  assert.match(migration, /add column if not exists supplier_group/);
  assert.match(migration, /set supplier_code = preferred_ref\.external_code/);
  assert.match(migration, /supplier_group = coalesce/);
  assert.match(suppliers, /label="Item Group"/);
  assert.match(suppliers, /AutoCount \{supplier\.supplier_code\}/);
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
  assert.ok(analysis.issueDetails.some((issue) => issue.code === "missing_item_list_record" && issue.itemCode === "MISSING00001" && issue.sourceRow));
  assert.ok(analysis.issueDetails.some((issue) => issue.resolution.includes("newer Item List")));
});

test("item groups without an authoritative creditor reference fail closed", () => {
  const { analyzeAutoCountFiles } = loadAnalyzer();
  const files = JSON.parse(read("tests/fixtures/autocount-sanitized.json"));
  files[1].rows[0]["Main Supplier"] = "";
  const analysis = analyzeAutoCountFiles(files, ["CK-PNG"]);
  assert.ok(analysis.blockingIssues.some((issue) => issue.includes("Item Group TEOWJOO has no Main Supplier AutoCount code")));
  assert.ok(analysis.issueDetails.some((issue) => issue.code === "missing_supplier_reference" && issue.itemCode === "TEOWJOO00001" && issue.sourceRow === 2));
  assert.ok(analysis.issueDetails.some((issue) => issue.resolution.includes("Do not use Item Group as a supplier identity")));
});

test("AutoCount Confirm keeps the same creditor-reference guard at the database boundary", () => {
  const migration = read("supabase/migrations/177_autocount_supplier_reference_guard.sql");
  assert.match(migration, /jsonb_array_length\(coalesce\(row_record\.normalized->.*external_refs/);
  assert.match(migration, /has no authoritative creditor reference/);
  assert.match(migration, /errcode = ''23514''/);
});

test("AutoCount blocking UI explains the impact, source row, and recovery action", () => {
  const workflow = read("src/components/imports/autocount-import-workflow.tsx");
  assert.match(workflow, /Confirm is locked until the source records are corrected/);
  assert.match(workflow, /No OMS records have been changed/);
  assert.match(workflow, /Item List may be older than the Location export/);
  assert.match(workflow, /What is wrong/);
  assert.match(workflow, /How to fix/);
});

test("AutoCount setup failures are actionable and do not expose PostgREST schema details", () => {
  const helper = read("src/lib/imports/autocount.ts");
  const preview = read("src/app/api/imports/autocount/preview/route.ts");
  const confirm = read("src/app/api/imports/autocount/confirm/route.ts");
  assert.match(helper, /apply migrations 169 and refresh the Supabase schema/);
  assert.match(helper, /No OMS records were changed/);
  assert.match(preview, /formatAutoCountInfrastructureError/);
  assert.match(confirm, /setupRequired/);
  assert.doesNotMatch(confirm, /message: error\.message/);
});
