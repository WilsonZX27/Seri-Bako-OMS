const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("JSON mutation routes reject explicit cross-site requests before processing payloads", () => {
  const guard = read("src/server/http/request-security.ts");
  const quickCreate = read("src/app/api/items/quick-create/route.ts");
  const imports = read("src/app/api/imports/confirm/route.ts");

  assert.match(guard, /origin !== requestOrigin/);
  assert.match(guard, /fetchSite === "cross-site"/);
  assert.match(quickCreate, /rejectCrossSiteMutation\(request\)/);
  assert.match(imports, /rejectCrossSiteMutation\(request\)/);
});

test("mutation route errors use the shared redacting server logger", () => {
  for (const file of [
    "src/app/api/items/quick-create/route.ts",
    "src/app/api/imports/confirm/route.ts",
  ]) {
    const source = read(file);
    assert.match(source, /logServerError/);
    assert.doesNotMatch(source, /console\.error/);
  }
});

test("API inputs keep filter syntax, object identifiers, and import cell sizes bounded", () => {
  const search = read("src/app/api/search/route.ts");
  const attachment = read("src/app/api/attachments/[id]/route.ts");
  const imports = read("src/app/api/imports/confirm/route.ts");

  assert.match(search, /function normalizeSearchQuery/);
  assert.match(search, /replace\(\/\[/);
  assert.match(search, /slice\(0, 80\)/);
  assert.match(attachment, /z\.string\(\)\.uuid\(\)/);
  assert.match(imports, /max\(2_000/);
});

test("imports derive one non-null tenant company context and do not fall back to a global default", () => {
  const imports = read("src/app/api/imports/confirm/route.ts");

  assert.match(imports, /companyId: activeProfile\.company_id/);
  assert.match(imports, /company_id: context\.companyId/);
  assert.match(imports, /update\(payload\)\.eq\("id", existing\.id\)\.eq\("company_id", context\.companyId\)/);
  assert.doesNotMatch(imports, /getDefaultCompanyId/);
});

test("attachment downloads layer tenant scope on top of permission and RLS checks", () => {
  const attachment = read("src/app/api/attachments/[id]/route.ts");

  assert.match(attachment, /requireActiveTenantActor/);
  assert.match(attachment, /\.eq\("company_id", actor\.companyId\)/);
  assert.match(attachment, /createSignedUrl/);
});

test("legacy attachment redirects are restricted to the configured Supabase storage origin", () => {
  const attachment = read("src/app/api/attachments/[id]/route.ts");

  assert.match(attachment, /requireSupabaseEnv/);
  assert.match(attachment, /legacyUrl\.origin === storageOrigin/);
  assert.match(attachment, /legacyUrl\.pathname\.startsWith\("\/storage\/v1\/object\/"\)/);
  assert.doesNotMatch(attachment, /legacyUrl\.protocol === "https:"\) return NextResponse\.redirect/);
});

test("supplier list search bounds and neutralises PostgREST filter syntax", () => {
  const suppliers = read("src/server/queries/suppliers.ts");

  assert.match(suppliers, /function normalizeSupplierSearch/);
  assert.match(suppliers, /slice\(0, 80\)/);
  assert.match(suppliers, /replace\(\/\[/);
  assert.match(suppliers, /const search = normalizeSupplierSearch\(filters\.search\)/);
});

test("global search is capability-gated before querying modules and quick item creation validates supplier scope", () => {
  const search = read("src/app/api/search/route.ts");
  const quickCreate = read("src/app/api/items/quick-create/route.ts");

  assert.match(search, /getPermissionMap/);
  assert.match(search, /permissions\["items\.view"\]/);
  assert.match(search, /permissions\["documents\.view"\]/);
  assert.match(search, /permissions\["purchase_request\.read"\]/);
  assert.match(search, /from\("purchase_requests"\)/);
  assert.match(search, /permissions\["purchase_order\.read"\]/);
  assert.match(search, /from\("purchase_orders"\)/);
  assert.match(search, /permissions\["stock_count\.read"\]/);
  assert.doesNotMatch(search, /status\.ilike/);
  assert.doesNotMatch(search, /status,remarks\.ilike/);
  assert.match(quickCreate, /from\("suppliers"\)/);
  assert.match(quickCreate, /\.eq\("company_id", actor\.companyId\)/);
  assert.match(quickCreate, /The selected supplier is unavailable/);
  assert.match(quickCreate, /\.finite\("Cost must be a valid number\."\)/);
  assert.match(quickCreate, /\.max\(1_000_000, "MOQ exceeds the permitted limit\."\)/);
  assert.match(quickCreate, /\.max\(3_650, "Lead time exceeds the permitted limit\."\)/);
});

test("global search fails closed without exposing database or policy details", () => {
  const search = read("src/app/api/search/route.ts");
  const globalSearch = read("src/components/search/global-search.tsx");

  assert.match(search, /try \{/);
  assert.match(search, /logServerError\(error, \{ source: "api\.search" \}\)/);
  assert.match(search, /Search is temporarily unavailable/);
  assert.match(search, /status: 503/);
  assert.match(globalSearch, /Searching…/);
  assert.match(globalSearch, /Search is temporarily unavailable\. Try again\./);
  assert.match(globalSearch, /No matching records\./);
  assert.doesNotMatch(globalSearch, /No results found\./);
});

test("admin-backed master image uploads verify file bytes and callers verify tenant-owned records first", () => {
  const storage = read("src/server/storage/master-data-image.ts");
  const items = read("src/server/actions/items.ts");
  const products = read("src/server/actions/products.ts");

  assert.match(storage, /hasExpectedImageSignature/);
  assert.match(storage, /Image content does not match its file type/);
  assert.match(items, /eq\("company_id", actor\.companyId\)/);
  assert.match(items, /Item was not found or is outside your workspace/);
  assert.match(products, /requirePermissionOrRedirect\("production\.create"/);
  assert.match(products, /eq\("company_id", actor\.companyId\)/);
  assert.match(products, /Product was not found or is outside your workspace/);
  assert.match(products, /\.eq\("product_id", productId\)/);
});

test("supplier and master-data mutations confirm a tenant-scoped target instead of silently updating zero rows", () => {
  const suppliers = read("src/server/actions/suppliers.ts");
  const masterData = read("src/server/actions/master-data.ts");

  assert.match(suppliers, /eq\("company_id", actor\.companyId\)/);
  assert.match(suppliers, /Supplier was not found or is outside your workspace/);
  assert.match(masterData, /Supplier item was not found or is outside your workspace/);
  assert.match(masterData, /UOM conversion was not found or is outside your workspace/);
  assert.match(masterData, /\.select\("id"\)\.maybeSingle\(\)/);
});

test("document uploads validate the document scope before storage writes and verify supported binary signatures", () => {
  const documents = read("src/server/actions/documents.ts");

  assert.match(documents, /hasExpectedAttachmentSignature/);
  assert.match(documents, /documentIdSchema\.safeParse\(documentId\)/);
  assert.match(documents, /requireActiveTenantActor/);
  assert.match(documents, /eq\("company_id", profile\.company_id\)/);
  assert.match(documents, /eq\("company_id", actor\.companyId\)/);
  assert.match(documents, /Document was not found or is outside your workspace/);
  assert.match(documents, /Attachment content does not match its file type/);
});
