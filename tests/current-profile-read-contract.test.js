const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const common = fs.readFileSync("src/server/queries/common.ts", "utf8");

test("the shared authenticated profile boundary reads an explicit staff projection", () => {
  const boundary = common.slice(
    common.indexOf("export const getCurrentProfile"),
    common.indexOf("export const getCompanyBranding"),
  );
  assert.doesNotMatch(boundary, /from\("staffs"\)\.select\("\*"\)/);
  assert.match(boundary, /select\("id,company_id,auth_user_id,staff_code,full_name,email,phone,avatar_url,default_branch_id,employment_type,employment_end_date,status,must_change_password,invitation_status,deleted_at"\)/);
  for (const required of ["id", "company_id", "full_name", "email", "phone", "avatar_url", "default_branch_id", "status", "must_change_password", "deleted_at"]) {
    assert.match(boundary, new RegExp(`\\b${required}\\b`));
  }
});
