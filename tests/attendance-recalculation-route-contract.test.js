const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const route=fs.readFileSync("src/app/api/attendance/recalculate/route.ts","utf8");
const page=fs.readFileSync("src/app/(app)/attendance/review/page.tsx","utf8");
const actions=fs.readFileSync("src/components/attendance/review-actions.tsx","utf8");

test("authorised operators can recalculate a finalised attendance batch",()=>{
  assert.match(route,/rejectCrossSiteMutation\(request\)/);
  assert.match(route,/requireActiveTenantActor\(\)/);
  assert.match(route,/attendance\.import/);
  assert.match(route,/attendance\.adjust/);
  assert.match(route,/rpc\("recalculate_attendance_week"/);
  assert.match(page,/AttendanceRecalculateButton/);
  assert.match(actions,/Recalculate latest import/);
});
