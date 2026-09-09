const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const migration=fs.readFileSync("supabase/migrations/276_attendance_non_holiday_recalculation.sql","utf8");

test("ordinary attendance days do not dereference an unassigned holiday pay rule",()=>{
  assert.match(migration,/pay_rule_id uuid/);
  assert.match(migration,/pay_rule_id:=null/);
  assert.match(migration,/pay_rule_id:=pay_rule\.id/);
  assert.match(migration,/'holiday_rule_version_id',pay_rule_id/);
  assert.doesNotMatch(migration,/'holiday_rule_version_id',pay_rule\.id/);
});
