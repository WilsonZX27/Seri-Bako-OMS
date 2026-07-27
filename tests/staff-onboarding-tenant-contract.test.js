const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("staff onboarding scopes selectable identities to the active company", () => {
  const createPage = read("src/app/(app)/staffs/new/page.tsx");
  const editPage = read("src/app/(app)/staffs/[id]/page.tsx");
  for (const source of [createPage, editPage]) {
    assert.match(source, /companies\.filter\(\(company\) => company\.id === companyId\)/);
    assert.match(source, /branches\.filter\(\(branch\) => branch\.company_id === companyId\)/);
    assert.match(source, /allRoles\.filter\(\(role\) => role\.company_id === companyId\)/);
  }
});

test("staff access choices stay role-compatible before submission", () => {
  const fields = read("src/components/staff-access-fields.tsx");
  assert.match(fields, /roleCode === "kitchen"[\s\S]*branch_type === "central_kitchen"/);
  assert.match(fields, /roleCode === "outlet_staff"[\s\S]*branch_type === "outlet"/);
  assert.match(fields, /nextDefault && !eligible\.includes\(nextDefault\)/);
  assert.match(fields, /disabled=\{isDefault\}/);
});

test("staff creation rejects mismatched tenant or branch type before a staff profile is inserted", () => {
  const actions = read("src/server/actions/foundation.ts");
  assert.match(actions, /async function assertStaffAccessIsEligible/);
  assert.match(actions, /\.eq\("company_id", companyId\)/);
  assert.match(actions, /Select only active branches in your company/);
  assert.match(actions, /Kitchen staff require a Central Kitchen branch/);
  assert.match(actions, /await assertStaffAccessIsEligible\(supabase, actor\.companyId, access\);[\s\S]*const \{ data, error \} = await supabase\.from\("staffs"\)\.insert/);
});
