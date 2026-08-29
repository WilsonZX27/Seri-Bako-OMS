const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (...parts) => fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

test("compliance preview reuses identity and enforces database scope", () => {
  const sql = read("supabase", "migrations", "228_compliance_staff_operations_preview.sql");
  assert.match(sql, /staff_id uuid references public\.staffs/);
  assert.match(sql, /can_access_company_branch/);
  assert.match(sql, /compliance\.sensitive\.read/);
  assert.match(sql, /redact_sensitive_compliance_metadata/);
  assert.match(sql, /'people_operations'/);
  assert.doesNotMatch(sql, /r\.role_code='finance'.*compliance/s);
  assert.match(sql, /enable row level security/g);
  assert.doesNotMatch(sql, /create table if not exists public\.employees/);
});

test("sensitive compliance files are authorized and audited at the API boundary", () => {
  const route = read("src", "app", "api", "attachments", "[id]", "route.ts");
  assert.match(route, /compliance\.sensitive\.read/);
  assert.match(route, /attachment_downloaded/);
  assert.match(route, /restricted to authorised People Operations staff/);
});

test("compliance UI exposes exception windows without medical detail", () => {
  const page = read("src", "app", "(app)", "compliance", "page.tsx");
  for (const label of ["Expired", "Due in 7 days", "Due in 30 days", "Due in 60 days", "Due in 90 days", "Missing document", "Pending review"]) assert.match(page, new RegExp(label));
  assert.match(page, /details restricted/);
  assert.doesNotMatch(page, /vaccination_date|vaccine_brand|medical_notes/);
});

test("compliance creation validates and stores canonical private attachments", () => {
  const action = read("src", "server", "actions", "compliance.ts");
  const form = read("src", "components", "compliance-create-form.tsx");
  assert.match(form, /name="file"/);
  assert.match(action, /document-attachments/);
  assert.match(action, /content does not match|signatureValid/);
  assert.match(action, /compliance\.sensitive\.read/);
});
