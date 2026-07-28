const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/lib/validations/foundation.ts", "utf8");
const actions = fs.readFileSync("src/server/actions/foundation.ts", "utf8");

test("company, branch, staff, role, and document-sequence schemas match tenant UUIDs and bounded business values", () => {
  assert.match(source, /company_id: z\.string\(\)\.uuid\("Company is required"\)/);
  assert.match(source, /company_name: z\.string\(\)\.trim\(\)\.min\(1, "Company name is required"\)\.max\(160\)/);
  assert.match(source, /branch_code: z\.string\(\)\.trim\(\)\.min\(1, "Branch code is required"\)\.max\(64\)/);
  assert.match(source, /default_branch_id: z\.string\(\)\.uuid\(\)/);
  assert.match(source, /role_id: z\.string\(\)\.uuid\("Primary role is required"\)/);
  assert.match(source, /accessible_branch_ids: z\.array\(z\.string\(\)\.uuid\("Branch is invalid"\)\)\.min\(1.*\.max\(100/);
  assert.match(source, /next_number: z\.coerce\.number\(\)\.int\(\)\.min\(1, "Current number must be positive"\)\.max\(9_999_999_999/);
});

test("administrative mutation boundaries validate route identifiers and permission payloads", () => {
  assert.match(actions, /const recordIdSchema = z\.string\(\)\.uuid\("The selected record is invalid\."\)/);
  assert.match(actions, /id = parseRecordId\(id\);/);
  assert.match(actions, /z\.array\(permissionOverrideSchema\)\.max\(500, "Too many permission overrides"\)/);
  assert.match(actions, /z\.array\(z\.string\(\)\.uuid\("Permission is invalid"\)\)\.max\(500, "Too many permissions"\)/);
});
