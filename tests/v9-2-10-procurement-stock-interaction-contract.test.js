const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

test("PR matching is dialog based and constrained to the canonical supplier route", () => {
  const page = read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx");
  const dialog = read("src", "components", "purchase-request-line-resolution-form.tsx");
  const migration = read("supabase", "migrations", "233_lock_pr_item_match_to_request_supplier.sql");

  assert.match(page, /matchingItemsFor/);
  assert.match(page, /mapping\.supplier_id === canonicalSupplierId/);
  assert.match(page, /supplierItemIds\.has\(item\.id\) \|\| item\.supplier_id === canonicalSupplierId/);
  assert.match(dialog, /<ModalShell/);
  assert.match(dialog, /PR supplier/);
  assert.match(dialog, /Open supplier item setup/);
  assert.match(migration, /canonical_supplier_id := request_row\.assigned_supplier_id/);
  assert.match(migration, /si\.supplier_id=canonical_supplier_id/);
  assert.match(migration, /upper\(trim\(si\.purchase_uom\)\)=upper\(trim\(unresolved_row\.requested_uom\)\)/);
  assert.doesNotMatch(migration, /mapped_supplier_id/);
});

test("PR matching accepts the same Item Master fallback that the UI offers", () => {
  const migration = read("supabase", "migrations", "236_align_pr_item_match_with_master_supplier_fallback.sql");

  assert.match(migration, /item\.supplier_id=canonical_supplier_id/);
  assert.match(migration, /coalesce\(item\.purchase_unit,item\.base_unit\)/);
  assert.match(migration, /not exists \([\s\S]*from public\.branch_supplier_items bsi/);
  assert.match(migration, /select item\.cost into mapped_unit_cost/);
  assert.match(migration, /if not found then[\s\S]*raise exception 'The selected item is not mapped/);
});

test("legacy PR units remain reviewable without inventing carton conversions", () => {
  const migration = read("supabase", "migrations", "293_allow_pr_match_across_legacy_purchase_uom.sql");
  assert.match(migration, /then si\.unit_cost else 0/);
  assert.match(migration, /then item\.cost else 0/);
  assert.match(migration, /order by \(bsi\.branch_id=request_row\.branch_id\) desc, \(upper\(trim\(si\.purchase_uom\)\)=upper\(trim\(unresolved_row\.requested_uom\)\)\) desc/);
  assert.match(migration, /'where bsi\.branch_id=request_row\.branch_id and bsi\.item_id=target_item_id',[\s\S]*'where bsi\.item_id=target_item_id'/);
  assert.doesNotMatch(migration, /update public\.items/);
  assert.doesNotMatch(migration, /update public\.supplier_items/);
});

test("Stock Count line controls align UOMs and confirm destructive removal", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const recovery = read("src", "components", "stock-count-line-recovery.tsx");

  assert.match(form, /grid-cols-\[minmax\(0,1fr\)_3\.5rem\]/);
  assert.match(form, /<Archive[^>]*\/>\{line\.retireAfterCount/);
  assert.match(recovery, /<ModalShell/);
  assert.match(recovery, /Confirm removal from this count/);
  assert.match(recovery, /disabled=\{mode === "remove" && !removeConfirmed\}/);
  assert.match(recovery, /<RefreshCw/);
  assert.match(recovery, /<Trash2/);
  assert.doesNotMatch(recovery, /showModal\(\)/);
});

test("attachments require a business label and People email preserves email casing rules", () => {
  const upload = read("src", "components", "documents", "attachment-upload-form.tsx");
  const documents = read("src", "server", "actions", "documents.ts");
  const people = read("src", "app", "(app)", "people", "[id]", "page.tsx");

  assert.match(upload, /name="file_name"[\s\S]*minLength=\{3\}[\s\S]*required/);
  assert.match(documents, /Name this attachment before uploading/);
  assert.doesNotMatch(documents, /attachmentLabel \?\? uploadedFile\.name/);
  assert.match(people, /staff\.email\?\.toLowerCase\(\)/);
  assert.doesNotMatch(people, /<dd className="mt-1 text-sm font-medium capitalize">/);
});
