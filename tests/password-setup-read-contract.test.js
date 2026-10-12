const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const session = fs.readFileSync("src/server/auth/staff-session.ts", "utf8");

test("password setup reads only the staff identity and invitation fields it renders", () => {
  const boundary = session.slice(
    session.indexOf("export async function getPasswordSetupContext"),
  );

  assert.doesNotMatch(boundary, /from\("staffs"\)\s*\.select\("\*"\)/);
  assert.match(
    boundary,
    /select\("id,email,invite_email,status,company_id,default_branch_id,invited_by,full_name,invited_at"\)/,
  );
});
