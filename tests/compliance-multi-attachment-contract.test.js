import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("site compliance supports named, independently removable attachments", () => {
  const page = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  const actions = read("src/server/actions/compliance.ts");
  const query = read("src/server/queries/compliance.ts");
  assert.match(page, /ComplianceAttachmentUpload/);
  assert.match(page, /record\.attachments\.map/);
  assert.match(page, /AttachmentRemoveAction/);
  assert.doesNotMatch(page, /min-h-32/);
  assert.doesNotMatch(page, /Close details|Replace document/);
  assert.match(actions, /addOutletComplianceAttachment/);
  assert.match(actions, /archiveOutletComplianceAttachment/);
  assert.match(actions, /attachment_id: next\?\.id \?\? null/);
  assert.match(query, /attachmentsByRecord/);
  assert.match(query, /attachments\.length > 0/);
});

test("compliance covers outlets and Central Kitchen but not Office", () => {
  const query = read("src/server/queries/compliance.ts");
  const migration = read("supabase/migrations/257_compliance_sites_and_multi_attachments.sql");
  const repair = read("supabase/migrations/258_compliance_rollout_repair.sql");
  assert.match(query, /\.in\("branch_type", \["outlet", "central_kitchen"\]\)/);
  assert.match(migration, /branch_type in \('outlet','central_kitchen'\)/);
  assert.doesNotMatch(migration, /branch_type in \([^\n]*office/);
  for (const label of ["Tenancy Agreement", "DBKL Licence", "Business License", "Fire Extinguisher", "POS License", "BOMBA Certificate", "FOSIM", "Pest Control"]) assert.match(migration, new RegExp(label));
  assert.match(query, /branchesResult\.data \?\? \[\]\)\.flatMap/);
  assert.match(query, /savedRequirementByKey/);
  assert.match(repair, /attachment_uploaded','attachment_archived/);
  assert.match(repair, /outlet_compliance\.upload/);
});

test("the current site checklist retires DBKL and assigns Pest Control everywhere", () => {
  const migration = read("supabase/migrations/259_replace_dbkl_with_pest_control.sql");
  assert.match(migration, /type_code = 'DBKL'/);
  assert.match(migration, /status = 'inactive'/);
  assert.match(migration, /'PEST_CONTROL', 'Pest Control'/);
  assert.match(migration, /branch_type in \('outlet', 'central_kitchen'\)/);
  assert.match(migration, /on conflict \(branch_id, compliance_type_id\) do update/);
});

test("compliance uses one structured disclosure list with aligned details", () => {
  const page = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  const upload = read("src/components/compliance-attachment-upload.tsx");
  assert.match(page, /mx-auto grid max-w-5xl gap-2/);
  assert.match(page, /lg:grid-cols-\[minmax\(0,1\.2fr\)_minmax\(18rem,0\.8fr\)\]/);
  assert.doesNotMatch(page, /Expiry not recorded · Document required/);
  assert.match(page, /grid items-end gap-3 sm:grid-cols-2/);
  assert.match(upload, /Choose file/);
  assert.match(upload, /buttonVariants\(\{ size: "sm" \}\)/);
});

test("legacy and entity-owned compliance attachments share protected delivery", () => {
  const route = read("src/app/api/attachments/[id]/route.ts");
  assert.match(route, /attachment\.entity_type === "compliance_record"/);
  assert.match(route, /eq\("attachment_id", id\)/);
  assert.match(route, /outlet_compliance\.document\.read/);
});
