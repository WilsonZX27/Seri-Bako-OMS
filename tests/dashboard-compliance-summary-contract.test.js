const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const dashboard = fs.readFileSync("src/server/queries/dashboard.ts", "utf8");
const compliance = fs.readFileSync("src/server/queries/compliance.ts", "utf8");

test("dashboard uses the compact compliance issue boundary", () => {
  assert.match(dashboard, /getOutletComplianceIssueCount/);
  assert.doesNotMatch(dashboard, /getOutletComplianceWorkspace/);
  assert.match(dashboard, /issues: complianceIssueCount, unavailable: complianceIssueCount === null/);
});

test("compliance issue count reads evidence identity without hydrating attachment metadata", () => {
  const start = compliance.indexOf("export async function getOutletComplianceIssueCount");
  const end = compliance.indexOf("export async function getPeopleCompliance");
  const boundary = compliance.slice(start, end);

  assert.match(boundary, /select\("id,branch_id,compliance_type_id,expires_on,review_status,updated_at"\)/);
  assert.match(boundary, /from\("attachments"\)[\s\S]*?select\("entity_id"\)/);
  assert.doesNotMatch(boundary, /file_name|storage_path|file_url|uploaded_by/);
});
